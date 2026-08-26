# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `78d6f7e` (`TBD-14: land E/F/G ruling on main + re-validation run #2 (CLOSE SATISFIED) (#39)`) **at the moment this file was written.** This file cannot record the commit that contains it: merging it advances `main` once more. **A live `git rev-parse --short HEAD` ahead of `78d6f7e` is expected and correct** — what would be wrong is a HEAD *behind* it (a stale checkout).
- **Tests:** **107 / 107 pass, 0 fail**, `tsc` clean. Verified with `npm test` on `main` at `78d6f7e`. **Node v25.2.1.** (No code changed since the TBD-14 build; this session was docs-only.)
- **Open PRs: 0.** This session merged **#37** (TBD-14 re-validation run #1 — close NOT satisfied), **#38** (the E/F/G `/decisions` ruling — see the mis-merge note below), and **#39** (recovered the ruling to `main` + re-validation run #2 — **close satisfied**).
- Working tree clean. `src/API.md` parses (4 JSON blocks) and its `orphans` description already documents route-to-directory propagation (landed with the TBD-14 build, rule 8) — matches code as committed. No `src/ERD.md` (no database). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Where the `context_audit` chain stands

- **TBD-16 (`routing_drift` precision): CLOSED** (2026-08-25). Nothing outstanding.
- **TBD-14 (`orphans` directory-granularity reachability): CLOSED / RESOLVED (2026-08-26).** Build merged (PR #35); re-validation run #2 satisfied the §3.4 categorical gate (PR #39). `orphans` is now weighting-**eligible**.
- **Next `context_audit` loop: TBD-11 (`bloat` aggregation shape)** — authorised, **unbuilt, no design yet.** This is the last sub-score blocking the TBD-10/11/12 weight NUMBERS.

---

## Active design doc

- **TBD-14 (complete):** `planning/designs/2026-08-25_directory-granularity-reachability-design.md` — **built, re-validated, closed.** §3.3/§3.4 amended this session with the unified `convention/runtime-discovered` accepted class.
- **TBD-11 (next):** **no design doc exists yet.** TBD-11 is a design loop to start from scratch — begin with `superpowers:brainstorming`, not code.

(TBD-16's design `2026-08-24_routing-drift-precision-design.md` and the base designs are built and closed.)

---

## Decisions + TBDs

### Resolved this session
- **TBD-14 → Resolved.** Two gates ran and landed:
  - **`/decisions` classification ruling** — `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md`. The re-validation's 162 unnamed residuals (E runtime-config 34, F component-metadata 110, G test-fixture 18) are folded into **one** unified accepted class **`convention/runtime-discovered (non-routed-by-design)`** (subsumes the former `SKILL.md` convention-discovered class B). Boundary = an **enumerated** convention set (skill discovery · agent-runtime config `.claude/**`/`WARP.md`/`cursor-hooks` · component-manifest `DESCRIPTION.md` · test-harness fixtures), growing **only by explicit ruling** — never a silent heuristic (silent-FN control). G was investigated before classifying: 17 harness-globbed fixtures fold in; 1 doc (`MSW_USAGE_GUIDE.md`) stays `genuine-abandoned`. **Rejected:** separate class per convention (reopens TBD-14 each new one). MECHANISM (edges vs exclusion) deferred to a downstream design.
  - **Re-validation run #2 (the close)** — `planning/calibration/2026-08-26_context-audit-tbd-14-revalidation-run2.md`. All **1 077** residual orphans classify (519 convention/runtime-discovered + 349 route-to-dir-nested + 189 dated-archival + 20 genuine-abandoned); **zero** reached by a non-enumerated convention; **zero** fix defects; all 20 genuine-abandoned audited against the conventions + filesystem. `src/TDD.md` TBD-14 row → **Resolved**.

### TBD-11 — the next actionable unit (Open, authorised, unbuilt, no design)
- **`bloat` aggregation shape.** Run-6 produced real TBD-11 data for the first time. The question is how `bloat` aggregates its per-doc signal into a sub-score (the router-DAG root→leaf chain metric feeds it) — a **shape** decision, data-informed. Start the design loop with `superpowers:brainstorming`; there is no spec yet. Numbers stay deferred (below).

### Still deferred / blocked
- **TBD-10 / TBD-11 / TBD-12 weight & threshold NUMBERS** — data-blocked. **Calibrate only from external hyperlink-routed repos, never from B-A-MCP's own run** (its backtick routing gives degenerate denominators). Eligibility now: `routing_drift` eligible (TBD-16), `orphans` eligible (TBD-14). `bloat` stays shape-blocked pending TBD-11. `coverage` was the sole load-bearing headline sub-score; it is **no longer sole** — `orphans` + `routing_drift` are eligible too.
- **TBD-12** `MIN_FILES`/coverage-significance numbers — data-blocked, sharpened by run-6, unresolved.
- **README true-sample** — gated behind the TBD-10/11/12 numbers. Must be a true run.
- **TBD-2 / TBD-4 / TBD-5 / TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched.

---

## Remaining work

- **TBD-11 design → build** (next session): brainstorm the `bloat` aggregation shape, write the design doc to `planning/designs/`, run the plan-and-build gates. No design exists — do not skip to code.
- The README true-sample and the TBD-10/11/12 numbers stay gated as above.

---

## Context not in the docs

- **A stacked PR can report MERGED while never reaching `main`.** This session's ruling PR (#38) was stacked with its base set to another open PR's branch (#37). The two merged ~31s apart, GitHub did **not** retarget #38 to `main`, and #38 landed on its (soon-deleted) feature base — its commit never reached `main`, though the PR badge said MERGED. Caught only by `git merge-base --is-ancestor <sha> main`, and recovered by cherry-pick (PR #39). **Lesson (logged as task-observer Obs 16):** after any stacked/non-trunk-based PR merges, verify trunk **ancestry** of the actual commit — never trust the "MERGED" badge; prefer basing on `main` over stacking on an open PR.
- **Run #1's residue total was mis-added (corrected in run #2).** PR #37's record said "1 146 → 1 087 (−59)"; the correct figures (re-confirmed fresh) are **1 146 → 1 077 (−69)** — its own breakdown (915 named + 162 unnamed) sums to 1 077. Component numbers were right; only the two totals were mis-summed. **Lesson (logged as task-observer Obs 17):** cross-foot any hand-entered aggregate in a record against its own itemized breakdown; prefer machine-computed totals.
- **The whole `context_audit` chain runs on one tie-breaker: visible false positive over silent false negative.** TBD-14's depth (directory-only over subtree), origin (root-restricted over flat), and the E/F/G ruling's enumerated-not-heuristic convention boundary were all decided this way. When a new choice appears, decide it on error *direction*, not on how small the affected corner is.
- **Re-validation is categorical, never a proportion.** A clean-looking headline is not a pass — every residual is named against an accepted class (now including `convention/runtime-discovered`) or it goes to `/decisions`. TBD-14 run #1 looked green yet failed on 162 unnamed residuals; that is the mechanism working. A residual reached by a convention **not** on the enumerated list returns to `/decisions` (the ratchet), it is never folded in silently.
- **The TBD-14 fix's correctness invariant (confirmed both runs):** propagation is directory-only, root-restricted, folded into the reachability DFS; the re-validation's teeth are the "should-have-been-reached" check (any orphan directly inside a directory-target routed by a *reached* source is a fix bug) — **zero** in both runs.

### `task-observer` — invoked this session; backlog needs its own review session
- `task-observer` **was** invoked at start of both this session's task phases (remedying the earlier build session's skip). Two observations logged this session: **Obs 16** (stacked-PR mis-merge) and **Obs 17** (cross-foot record totals).
- **The observation backlog is now 17 OPEN and `last-review-date.txt` is `never` — never reviewed.** A dedicated observation-review session is still owed (load `task-observer`'s `references/weekly-review.md`). The three earlier named-not-fixed process items (state-tagging, `str_replace` line-wrap, commit-backtick shell-eval) are in that backlog too. Named, not fixed.

---

## Next-session starter

> **Start TBD-11 — the `bloat` aggregation shape** (the last sub-score blocking the TBD-10/11/12 weight numbers). `context_audit`'s TBD-14 and TBD-16 loops are both **closed**; TBD-11 is authorised but **unbuilt with no design doc yet**, so this is a design loop from scratch, not a build. **First, invoke `task-observer` at session start** (CLAUDE.md requires it). Then read `CLAUDE.md`, this file, `src/CONTEXT.md`, `src/TDD.md` (the TBD-11 row), and `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` for the first real TBD-11 data. Confirm `git rev-parse HEAD` (≥ `78d6f7e`) and `npm test` (expect **107**) before trusting any figure.
>
> Begin with `superpowers:brainstorming` to settle the `bloat` aggregation shape (how per-doc bloat signal + the router-DAG root→leaf chain metric aggregate into the sub-score) — there is no spec, do not skip to code. Then `superpowers:writing-plans` (plan-document-reviewer checks it), `superpowers:executing-plans` under `superpowers:test-driven-development`, the code reviewers before finishing, and `superpowers:finishing-a-development-branch` to land — **branch + PR, never direct to `main`; and after any stacked/non-trunk PR merges, verify trunk ancestry of the commit, never trust the MERGED badge (this session's Obs 16).** `src/API.md` updates in the same commit as any tool-schema change (rule 8). Keep the standing tie-breaker (visible FP over silent FN) and the ratchet (a decision the design does not settle goes to `/decisions`, not into the work).
>
> Standing: no threshold/weight NUMBER is set here — TBD-10/11/12 numbers are data-blocked (external hyperlink-routed repos only, never B-A-MCP's own run). `orphans` and `routing_drift` are now weighting-**eligible**; `coverage` is no longer the sole load-bearing headline sub-score; only `bloat` remains shape-blocked (that is what TBD-11 lifts). README true-sample stays gated behind the numbers. Also owed, each its own session: the **`task-observer` backlog review** (17 OPEN, never reviewed) carrying the three named process items plus this session's Obs 16/17.
