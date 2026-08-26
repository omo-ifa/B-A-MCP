# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-25

- **`main` HEAD:** `95645e0` (`design+plan: TBD-14 directory-granularity reachability (root-restricted), reviewed CLEAN (#33)`) **at the moment this file was written.** This file cannot record the commit that contains it: merging it advances `main` once more. **A live `git rev-parse --short HEAD` ahead of `95645e0` is expected and correct** — what would be wrong is a HEAD *behind* it (a stale checkout).
- **Tests:** **102 / 102 pass, 0 fail**, `tsc` clean. Verified with `npm test` on `main` at `95645e0`. **Node v25.2.1.** (No production code changed this session — TBD-14 landed docs only, so the count is unchanged from the TBD-16 close; the TBD-14 build takes it to 107.)
- **Open PRs: 0.** This session merged **#33** (TBD-14 design + reviewed plan + the root-restriction decision).
- Working tree clean. `src/API.md` parses (4 JSON blocks). No `src/ERD.md` (no database). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Where the `context_audit` chain stands

- **TBD-16 (`routing_drift` precision): CLOSED** last session — re-validated (run #2), D2/D3 confirmed (`routing_drift` scored-real, `routing_path_missing` `high`). Nothing outstanding.
- **TBD-14 (`orphans` directory-granularity reachability): design + reviewed plan LANDED, Open pending execution.** This is the **next actionable unit** — everything is decided.

---

## Active design doc

**`planning/designs/2026-08-25_directory-granularity-reachability-design.md`** — **approved, reviewed, NOT yet built.** Its plan (`docs/superpowers/plans/2026-08-25-directory-granularity-reachability.md`) is on `main`, reviewed live **twice** (flat → then re-reviewed after the root-restriction amendment) to **CLEAN / Ready to execute**. No code exists for it yet.

(TBD-16's design `2026-08-24_routing-drift-precision-design.md` is built and closed. Base designs `2026-08-20_agents-md-router-recognition-design.md` and `2026-08-18_context-audit-design.md` are built.)

---

## Decisions + TBDs

### Resolved this session
- **Root-restriction of TBD-14 directory propagation** (`planning/decisions/2026-08-25_tbd-14-root-restricted-dir-propagation.md`) — surfaced by the first plan review. A directory route propagates reachability **only from a reached document** (flat rejected as a silent false negative). This is a *design/plan* decision, not a TBD status change; TBD-14 stays Open.

### TBD-14 — the next actionable unit (Open, fully decided)
- **What:** `orphans` computes reachability over document→document edges, but much real routing is directory-granular — superset routes to directories, so 113/113 docs orphan while `coverage` reads 73. Fix: a resolved edge to a **directory** makes the documents it **directly contains** reachable.
- **Two settled choices** (both on the error-direction principle): **depth = directory-only** (a doc in a *subdirectory* of a routed dir stays an orphan; full-subtree rejected as masked-rot); **origin = root-restricted** (a directory route propagates only from a *reached* document, folded into the reachability DFS — flat rejected as silent-FN). **Pinned by tests T-dir-4** (unreached non-root doc's dir link does NOT rescue) **and T-dir-5** (reached non-root doc DOES propagate).
- **Remaining work:** **(1)** TDD build from `main` (the plan's Task 0 branches from `main`; 102→**107** tests; the `graph.ts` change is `dirTargetsBySrc` per-source + DFS-fold, `src/API.md` same-commit rule 8). **(2)** then a **categorical re-validation** run on the pinned nine-repo corpus — the **only** thing that closes TBD-14: every residual orphan must classify as genuine-abandoned or a named accepted layout class (**route-to-directory-nested**, **convention-discovered**, **dated-archival**). Any residual fitting neither → `/decisions`.
- **`orphans` stays out of TBD-10 weighting** until that lands and re-validates.

### Queue behind TBD-14
- **TBD-11** — bloat-aggregation shape. Authorised as its own loop, **unbuilt**. No design yet.
- **TBD-10 / TBD-11 / TBD-12 weight & threshold NUMBERS** — data-blocked. **Calibrate only from external hyperlink-routed repos, never from B-A-MCP's own run** (its backtick routing gives degenerate denominators). `routing_drift` is now weighting-**eligible** (TBD-16 lifted its correctness-null) but the NUMBER is still deferred; `orphans` becomes eligible only after TBD-14 re-validates.
- **`coverage` remains the sole load-bearing headline routing-layer sub-score** until TBD-14 (orphans) and TBD-11 (bloat shape) both land.
- **README true-sample** — gated behind the TBD-10/11/12 numbers. Not now; must be a true run.
- **TBD-2 / TBD-4 / TBD-5 / TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched.

---

## Remaining work

- **Execute TBD-14** (next session): build the plan under `superpowers:test-driven-development`, then run the categorical re-validation. See the plan for task-by-task steps and the confirmed red states.
- **TBD-11** design → build, when picked.
- The README true-sample and the TBD-10/11/12 numbers stay gated as above.

---

## Context not in the docs

- **The whole `context_audit` chain runs on one tie-breaker: visible false positive over silent false negative.** Every ratchet trip resolved that way — TBD-16's loose-C1 rejection, the CommonMark `<dest>` fix, the placeholder/bare-filename shape exclusions, TBD-14's depth (directory-only over full-subtree) and origin (root-restricted over flat). When a new choice appears, decide it on error *direction*, not on how small the affected corner is; a small corner on the silent-FN side is exactly what ships wrong because nobody is forced to look.
- **Re-validation is categorical, never a proportion.** A clean-looking headline is not a pass — every residual is named against an accepted class or it goes to `/decisions`. TBD-16 run #1 looked great (59→28, 17/9 split) yet failed the gate on 7 unnamed FPs; that is the mechanism working.
- **The TBD-14 build has a subtle correctness point:** propagate from **directory targets recorded per source doc**, NOT from `routedDirs` (which also holds doc-parent dirs for `coverage`); and fold propagation **into the DFS** so only a reached node propagates. The plan's three counterfactuals (flat, full-subtree, all-`routedDirs`) each break a specific guard test — keep all five tests; a green suite under the wrong implementation is the trap.

### Three named-not-fixed PROCESS items — one family, for the observation-review session (its own session)
All three are the same root cause: **literal text handed to a shell-adjacent tool must be verified as literal, not silently transformed.** Named, not fixed; carry them across this boundary.
- **State-tagging fault** — a recorded red/green state must carry *which code-state it was measured against* (this chain twice recorded a red against the wrong state and re-derived).
- **`str_replace` line-wrap no-op hazard** — a single-line search-and-replace whose target wraps across two source lines matches nothing and silently no-ops; an edit that "succeeds" without changing anything is invisible.
- **Commit-message backtick shell-eval trap** — `git commit -m "…"` with backticks lets the shell command-substitute them, silently stripping content (hit once this chain; use `git commit -F -` / a heredoc).

(The observation log holds observations 1–15 and was not touched this session.)

---

## Next-session starter

> Execute **TBD-14** — directory-granularity reachability for `orphans`. It is fully decided and the plan is reviewed CLEAN. Read `CLAUDE.md`, this file, the plan `docs/superpowers/plans/2026-08-25-directory-granularity-reachability.md`, its spec `planning/designs/2026-08-25_directory-granularity-reachability-design.md` (§3.1–§3.4), and the decision `planning/decisions/2026-08-25_tbd-14-root-restricted-dir-propagation.md`. Confirm `git rev-parse HEAD` and `npm test` (expect **102**) before trusting any figure.
>
> Build the plan task-by-task under `superpowers:test-driven-development` (or `superpowers:subagent-driven-development`) — Task 0 branches from `main`; confirm each red state on-machine before implementing (`;` not `&&`, so the assertions actually run), recording which code-state each red was measured against. Expect **102 → 107**. `src/API.md` updates in the same commit as the code (rule 8); `coverage.ts`/`score.ts`/`index.ts`/`TBD_10_WEIGHTS`/`ROUTING_LAYER_KEYS` are untouched. Then `superpowers:requesting-code-review` → `superpowers:receiving-code-review` → `superpowers:finishing-a-development-branch`.
>
> **Landing the code does not close TBD-14** — a **categorical re-validation** on the pinned nine-repo corpus does (every residual orphan named as genuine-abandoned or an accepted layout class). Only then does `orphans` become eligible for TBD-10 weighting (eligibility only; the NUMBER stays deferred). Standing: no threshold/weight number; branch + PR, never direct to `main`; the ratchet — a decision the design does not settle goes to `/decisions`, not into the build. Behind TBD-14: **TBD-11** (bloat shape). The three process items wait for a dedicated observation-review session — named, not fixed.
