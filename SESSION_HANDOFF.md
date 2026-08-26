# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `5572e5d` (`TBD-11: bloat aggregates by worst-case chain, not flat sum (shape built; numbers deferred) (#41)`) **at the moment this file was written.** Merging this handoff advances `main` once more — **a live `git rev-parse --short HEAD` ahead of `5572e5d` is expected and correct**; what would be wrong is a HEAD *behind* it (a stale checkout).
- **#41 trunk ancestry CONFIRMED**, not trusted from the badge: `git merge-base --is-ancestor 5572e5d6556fc963a99c74b52fb1bed1f64431cc main` → exit 0 (Obs 16 applied).
- **Tests:** **112 / 112 pass, 0 fail**, `tsc --noEmit` clean. Verified on `main` at `5572e5d` **post-merge** (not just pre-merge). **Node v25.2.1.** (TBD-11 build landed +5 tests: 107 → 112.)
- **Open PRs: #40 only** (see below). **#41 merged** (TBD-11 bloat shape) and its branch deleted (local + remote). This session opens one further PR for this handoff doc.
- Working tree clean before this write. `src/API.md` parses (4/4 JSON blocks) and `bloat` is unchanged `{score,n}` — matches code. No `src/ERD.md` (no database). Context-budget ledger unchanged at **252 / ~4000** (bloat reshape touched no tool surface). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

### PR #40 — stale, SUPERSEDED by this handoff
- **#40** (`docs/handoff-2026-08-26-tbd-14-closed`, base `main`) is the *previous* session's handoff. It is MERGEABLE/CLEAN over the new `main` and does **not** conflict with #41 (which never touched `SESSION_HANDOFF.md`) — but its **content is now stale** (it says "TBD-11 next, unbuilt"; TBD-11's shape is now built + merged). **This handoff is a strict superset of #40.** Recommend **closing #40 unmerged** and merging this one instead. Do not merge both — they both rewrite `SESSION_HANDOFF.md`, so whichever lands second will conflict.

---

## Where the `context_audit` chain stands

- **TBD-16 (`routing_drift` precision): CLOSED** (2026-08-25).
- **TBD-14 (`orphans` directory-granularity reachability): CLOSED / RESOLVED** (2026-08-26, PR #39). `orphans` is weighting-**eligible**.
- **TBD-11 (`bloat` aggregation shape): SHAPE RESOLVED + BUILT + MERGED** (2026-08-26, PR #41). The flat-sum-over-routers defect (run-6: caveman `0/n40`) is fixed — the sub-score is now driven by the **worst root→leaf chain** (worst-case, count-invariant), `inline_ratio` dropped. **`bloat`'s SHAPE blocker is lifted.** Cutoff NUMBERS stay Open + deferred (rule 7).
- **All four routing-layer sub-scores (`orphans`, `routing_drift`, `coverage`, `bloat`) are now SHAPE-CLEAN.** No correctness/shape blocker remains on any of them.
- **Next `context_audit` loop: the TBD-10/11/12 weight & threshold NUMBERS** — the last gating work before the README true-sample. Data-blocked on external hyperlink-routed repos (see below).

---

## Active design doc

- **TBD-11 (complete):** `planning/designs/2026-08-26_bloat-worst-case-aggregation-design.md` — **built, reviewed CLEAN, merged (#41), complete.**
- (TBD-14 `2026-08-25_directory-granularity-reachability-design.md`, TBD-16 `2026-08-24_routing-drift-precision-design.md`, and the base designs are built + closed.)
- **Next loop (TBD-10/11/12 numbers): no design doc exists yet** — it is a calibration + `/decisions` loop, not a code build. Start from data, not code.

---

## Decisions + TBDs

### Resolved this session
- **TBD-11 aggregation shape → Resolved (numbers still Open).** `planning/decisions/2026-08-26_tbd-11-bloat-worst-case-aggregation.md`: chose **worst-case over the heaviest root→leaf chain** (candidate `worst-case`; `mean` rejected — dilutes a catastrophic router; `per-chain-only` rejected on the house tie-breaker — silent on a mid-chain giant). Per-router size term taken **MAX over routers, never summed**; the two token terms combine by `max(chain_token_term, max_router_term)` (not sum — the heaviest router sits on the worst chain, summing double-counts); **depth adds** (separate axis). **`inline_ratio` dropped** (metric + finding + its two constants) — broken by construction. `src/TDD.md` TBD-11 row updated (shape RESOLVED/BUILT, numbers DEFERRED); `planning/Roadmap.md` updated. **No cutoff NUMBER set (rule 7).**

### Still deferred / blocked
- **TBD-10 / TBD-11 / TBD-12 weight & threshold NUMBERS — the next actionable unit, data-blocked.** Calibrate **only from external hyperlink-routed repos, never from B-A-MCP's own run** (its backtick routing gives degenerate denominators). Eligibility now: `routing_drift` (TBD-16), `orphans` (TBD-14), `bloat` (TBD-11 shape) all eligible; `coverage` was never blocked. `coverage` is no longer the sole load-bearing headline sub-score. Current stub weights (`src/tools/context-audit/score.ts` `TBD_10_WEIGHTS`) and per-term cutoffs (`bloat.ts`: `ROUTER_TOKEN_CUTOFF=3000`, `CHAIN_TOKEN_CUTOFF=6000`, `CHAIN_DEPTH_CUTOFF=4`; `coverage.ts`: `MIN_FILES=5`) stay stubbed — **read from source, not from a tracker.**
- **TBD-12** `MIN_FILES`/coverage-significance numbers — data-blocked, sharpened by run-6, not forked, unresolved.
- **README true-sample** — gated behind the TBD-10/11/12 numbers. Must be a true run.
- **TBD-2 / TBD-4 / TBD-5 / TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched.

---

## Remaining work

- **TBD-10/11/12 NUMBERS calibration** (next): the gating work. Needs external hyperlink-routed calibration repos (run-6's nine-repo corpus gave shape data but the NUMBERS still need a neutral, non-single-author sample). Then the README true-sample.
- **PR #40** — close unmerged (superseded); **this handoff PR** — merge.
- The README true-sample and the numbers stay gated as above.

---

## Context not in the docs

- **The `max`-combine guard was proven by mutation this session.** Flipping `Math.max(chainTokenTerm, maxRouterTerm)` → `+` in `bloat.ts:102` reddens exactly one test — `token terms MAX-combine, not SUM: a lone router that IS its own heavy chain is not double-counted` (`test/context-audit/bloat.test.ts`, the 9000-token-lone-router fixture asserting `subscore===70`, not the sum-combine `55`). 111 pass / 1 fail under `+`; reverted → 112/112. The double-count the design forbids is genuinely guarded.
- **Obs 16 (stacked-PR mis-merge) re-applied and held.** #41 was based directly on `main` (no stacking); post-merge ancestry was verified by `git merge-base --is-ancestor`, not the MERGED badge. Keep doing this after every merge.
- **The whole `context_audit` chain still runs on one tie-breaker: visible false positive over silent false negative.** TBD-11's worst-case-over-per-chain-only choice and its "findings enumerate every breaching router while the subscore scores only the worst" split were both decided this way. Decide any new choice on error *direction*, not on how small the affected corner is.
- **Findings vs. subscore are deliberately decoupled in `bloat`.** The findings array lists **every** breaching router/chain (transparency); only the **subscore** is worst-case. Do not "fix" this into scoring every finding — that reintroduces the count-domination defect.

### `task-observer` — invoked this session; backlog still owed its own review session
- `task-observer` **was** invoked at session start. **One observation logged this session: Obs 18** — a TDD guard test can silently rely on the very code path a change removes (the mid-chain-giant guard initially "passed" only via the soon-removed `inline_ratio` term, and its intended router term rounded to 0 because the fixture was under a full `floor()`-step over the cutoff; caught by hand-tracing the arithmetic).
- **Backlog is now 18 OPEN and `last-review-date.txt` is `never` — never reviewed.** A dedicated observation-review session is still owed (load `task-observer`'s `references/weekly-review.md`). The three earlier named-not-fixed process items (state-tagging, `str_replace` line-wrap, commit-backtick shell-eval) are in that backlog. **Named, not fixed** — carry, do not action here.

---

## Next-session starter

> **Start the TBD-10/11/12 weight & threshold NUMBERS calibration** — the last gating work before the README true-sample. All four `context_audit` routing-layer sub-scores (`orphans`, `routing_drift`, `coverage`, `bloat`) are now **shape-clean and eligible**; only the NUMBERS remain. **First, invoke `task-observer` at session start** (CLAUDE.md requires it). Then read `CLAUDE.md`, this file, `src/CONTEXT.md`, `src/TDD.md` (the TBD-10 / TBD-11 / TBD-12 rows), and `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md`. Confirm `git rev-parse HEAD` (≥ `5572e5d`) and `npm test` (expect **112**) before trusting any figure.
>
> This is a **data + `/decisions` loop, not a code build** — there is no design doc yet. **Calibrate ONLY from external hyperlink-routed repos, never from B-A-MCP's own run** (its backtick routing gives degenerate denominators). Run-6's nine-repo corpus gave the *shape* data; the *numbers* need a neutral, non-single-author sample — decide whether run-6's repos suffice or a fresh external sample is required, then derive the weights (`TBD_10_WEIGHTS`) and per-term cutoffs. Route every number through `/decisions` (Gate 2) and record the reasoning; if it needs a design, `superpowers:brainstorming` first. Keep the standing tie-breaker (visible FP over silent FN) and the ratchet (a decision the design does not settle goes to `/decisions`, not into the work). When code changes, build under `superpowers:test-driven-development`, run the code reviewers before finishing, land via `superpowers:finishing-a-development-branch` — **branch + PR, never direct to `main`; after any merge verify trunk ancestry with `git merge-base --is-ancestor`, never the MERGED badge (Obs 16).** `src/API.md` updates in the same commit as any tool-schema change (rule 8); re-measure the ledger if the surface changes (rule 2).
>
> **Housekeeping owed, each its own session:** the **`task-observer` backlog review** (18 OPEN, never reviewed) carrying the three named process items plus this session's Obs 18. And **PR #40** should be closed unmerged (this handoff superseded it).
