# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `aba11a9` (`feat(context_audit): TBD-18 orphans genuine-abandoned re-base (built; re-validation opens TBD-19/20) (#51)`). Working tree **clean**.
- **Tests:** **126 / 126 pass**, `tsc --noEmit` clean, **Node v25.2.1**. Breakdown (from `test/`): `context-audit/` **122** — accepted-layout **7**, bloat 11, coverage 8, graph **35**, ledger 1, links 15, orchestrate **18**, render 2, root 6, score 11, tokens 1, walk 7 — plus `packaging.test.ts` **1** and `server.test.ts` **3** = **126**. TBD-18 added **+11** over the prior 115 (accepted-layout 7, graph +2, orchestrate +2).
- **Merge verification (Obs 20):** PR #48 (plan) and PR #51 (build) both landed by **squash**; verified by **content on trunk** (symbols + new files present, suite re-run on `main`), never by branch-SHA ancestry. `git merge-base --is-ancestor <branch-sha> main` FAILS by design on a squash — not a broken merge.
- **Open PRs: none.** `feat/tbd-18-orphans-rebase` merged and deleted.
- `src/API.md` parses (**4/4** JSON blocks) and matches the code (documents `stats.genuine_abandoned_count` + the re-based `orphans` semantics; 4 mentions). No `src/ERD.md` (no database). **Context-budget ledger re-measured = 252 / ~4000** (rule 2 — unchanged; the wire `contextAuditTool.outputSchema.properties.stats` is the opaque `{type:"object"}`). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **TBD-18 — `orphans` genuine-abandoned re-base:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` — **approved + BUILT** (implemented and landed this session). The build is complete; the design's **§6 close condition is NOT satisfied** (see below), so the design's own exit criterion remains open pending TBD-19 + TBD-20.
- **Plan (executed):** `docs/superpowers/plans/2026-08-26-orphans-genuine-abandoned-rebase.md` — all 8 tasks executed via subagent-driven-development under TDD, plus one final-review fix (R6). Landed.
- **Re-validation record:** `planning/calibration/2026-08-26_context-audit-tbd-18-revalidation.md` — the categorical close-condition run (verdict: **CLOSE NOT SATISFIED**).

---

## Decisions + TBDs

### This session

- **No TBD was resolved.** TBD-18's re-base was built and landed, but the categorical re-validation on the pinned nine-repo corpus **failed the close condition** — so TBD-18 does **not** close. No `planning/decisions/` record is written for a non-resolution; the reasoning lives in the calibration doc above and the TDD tracker.
- **`src/TDD.md` updated:** TBD-18 row appended with BUILT-not-CLOSED + the two silent-FN findings; **TBD-19** and **TBD-20** opened (below). `planning/Roadmap.md` updated with the same (the `context_audit` status line). No phase shift — `override_log` is still next once `context_audit` stops moving.
- **task-observer Obs 22 logged** (`~/.claude/projects/<id>/skill-observations/log.md`, Status OPEN): *a required-field schema addition's file scope is every literal that constructs the type, not just the definition + consumers* — surfaced by Task 7, where adding required `AuditStats.genuine_abandoned_count` broke the pre-existing `render.test.ts` fixture at `tsc`. Backlog now **1 OPEN**.

### TBD-18 — BUILT, NOT CLOSED (the headline state)

The numerator-only re-base is correct and landed: `orphans = 1 − genuineAbandonedCount / orphanCandidateTotal`, findings still enumerate every candidate, `stats.genuine_abandoned_count` surfaced (score reconstructable from output), `orphans` still **excluded from the headline** (`TBD_10_WEIGHTS`/`ROUTING_LAYER_KEYS` untouched — **zero score impact today**). Re-validation: fidelity + reconstruction pass on all 9 repos; orphan population unchanged at **1 077**; **19/20** genuine-abandoned survive. **But two confirmed silent-FN vectors block closure** → TBD-19 + TBD-20.

### Open TBDs — the two gates now in front of the `orphans` weight

- **TBD-19 — D1 route-to-dir-nested basis (silent FN).** `isRouteToDirNested` keys on the broad `routedDirs`, which `graph.ts` populates from **file-parent** additions (a router linking `dir/file.md` adds `dir`) and root `""`, not directory-**target** routes as design §D1 intended. Confirmed casualty: Ghost `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` (one of the 20 genuine-abandoned) is silently netted because `apps/admin` is in `routedDirs` only via a link to `apps/admin/README.md`. **Stub:** D1 unchanged in code. **Candidate direction (no guess):** re-base D1 onto the directory-target set (`dirTargetsBySrc`, already computed in `graph.ts` for reachability, not exposed). A design decision → `/decisions`.
- **TBD-20 — D4b `plans/`/`CHANGELOG/` disposition (silent FN).** D4b is convention-tight, not structural. Of 34 D4b-sole nets, 32 are legit (superset `CHANGELOG/<version>.md` archives) but **2 are live ready-to-build posthog PRDs** under `products/desktop/docs/plans/`. **Stub:** D4b unchanged in code. **Candidate directions:** drop D4b; tighten (require a dated filename / version-shaped sibling set); or keep with a documented carve-out. → `/decisions` (design §9 item 4 pre-registered this).
- **TBD-10 — `orphans` weight only.** Still gated; now sits **behind TBD-19 + TBD-20** (both must resolve and the re-validation must re-pass before TBD-18 closes and `orphans` becomes weighting-eligible). `coverage`/`bloat`/`routing_drift` weights are set (`{routing_drift:1, coverage:3, bloat:1}`); `orphans` excluded.
- **TBD-12** — source-vs-test significance **basis** still open (`MIN_FILES=5` resolved).
- **TBD-2 / TBD-4 / TBD-5 / TBD-9 / TBD-15** — packaging / notices / pricing / doc_drift scope / v1.1 root.method. Open, untouched.

---

## Remaining work

- **TBD-19 + TBD-20 at `/decisions`** — the two silent-FN vectors. TBD-19 (D1 basis) likely needs a small design (change to the detector's input set); TBD-20 (D4b) may be a pure ruling. Both are prerequisites to closing TBD-18.
- **Re-run the categorical re-validation** after TBD-19/20 build — the corpus harness lived in the session scratchpad (`tbd18-revalidation.mjs`); reproduction steps + detector totals are in the calibration doc's appendix. Only a passing re-run closes TBD-18.
- **Then:** `/decisions` to set the `orphans` weight (TBD-10) → the **README true-sample** (still gated behind the weight, behind TBD-18).
- **Docs:** all current (API.md, ledger, TDD.md, Roadmap.md updated this session). Nothing outstanding.

---

## Context not in the docs

- **The calibration corpus is intact at `~/dev/ba-calibration/`** at the pinned run-6 commits (verified unchanged this session): superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill `281f134`, icm-architect `b20fb45`. Harness = `runContextAudit({ path })` (production) + `walk`/`buildGraph`/`computeSkillDirs`/`isAcceptedLayout` (exported) for per-doc attribution; the **Obs 19 fidelity gate** (re-derived genuine == production `stats.genuine_abandoned_count`) passed 9/9, so the per-doc attribution in the calibration doc is trustworthy.
- **Why the build landed despite the close failing:** the defects are in detector **breadth/basis**, not the numerator-only shape or the surfacing — fixable without reverting anything — and `orphans` carries no weight, so there is no headline impact. Landing advances the code and records precisely what must happen before weighting.
- **R6 root-`SKILL.md` guard** (`computeSkillDirs` skips a `""` parent): fixed a whole-repo silent-FN the whole-branch reviewer flagged. Not exercised against rot on this corpus (the two root-`SKILL.md` repos have 0 orphans), but correct and kept.
- **Session rulings (workspace deleted):** R1 verbatim plan tests kept; R2 rule-8 satisfied by squash; R3 Obs-18 mutation-pair discharged; R4 `render.test.ts` fixture forced by the required-field add (→ Obs 22); R5 accepted an API.md `score`-desc coherence fix; R6 root-`SKILL.md` guard.
- **task-observer:** backlog was 0 OPEN at start; Obs 22 logged this session → now **1 OPEN**. Manual-trigger review cadence (local-only log; the next review is the user's call).

---

## Next-session starter

> **Resolve TBD-19 + TBD-20 — the two gates in front of the `orphans` weight.** Read `CLAUDE.md`, this file, `WORKFLOW.md`, the re-validation record `planning/calibration/2026-08-26_context-audit-tbd-18-revalidation.md`, and `src/TDD.md` (TBD-18/19/20 rows). Confirm `git rev-parse HEAD` (`aba11a9`) and `npm test` (expect **126**) before trusting any figure; read constants from source.
>
> **TBD-19 (D1 basis)** — re-base `isRouteToDirNested` onto the directory-**target** set (`dirTargetsBySrc`) instead of the broad `routedDirs`. This changes a detector's input set, so run it through **`/decisions`** (Gate 2); if it needs a design, **`superpowers:brainstorming`** → **`/design-doc`** first. **TBD-20 (D4b)** — decide `plans/`/`CHANGELOG/` disposition at **`/decisions`** (may be a pure ruling, no design). Then build with **`superpowers:writing-plans`** → **`superpowers:subagent-driven-development`** (or **`superpowers:executing-plans`**) under **`superpowers:test-driven-development`**; **`superpowers:requesting-code-review`** before finishing. **Re-run the categorical re-validation** on the pinned corpus at `~/dev/ba-calibration/` (design §6 — every netted orphan a true accepted-layout doc; the 20 genuine survive incl. Ghost `MSW_USAGE_GUIDE.md`; D4b nets checked individually, §6.2) as a new `planning/calibration/` doc. Land via **`superpowers:finishing-a-development-branch`** (branch + PR, squash, verify content on trunk — Obs 20). **Only a passing re-validation closes TBD-18** and unblocks the `orphans` weight — a separate **`/decisions`** (TBD-10) — followed by the README true-sample. Update `src/TDD.md` + `planning/Roadmap.md`. Do **not** set the `orphans` weight or change findings enumeration (out of scope); no threshold/weight NUMBER (rule 7); `src/API.md` same commit as any schema change (rule 8); re-measure the ledger (rule 2).
