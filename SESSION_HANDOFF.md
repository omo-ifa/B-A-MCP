# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-25

- **`main` HEAD:** `fc3e493` (`feat(context_audit): directory-granularity reachability for orphans (#35)`) **at the moment this file was written.** This file cannot record the commit that contains it: merging it advances `main` once more. **A live `git rev-parse --short HEAD` ahead of `fc3e493` is expected and correct** — what would be wrong is a HEAD *behind* it (a stale checkout).
- **Tests:** **107 / 107 pass, 0 fail**, `tsc` clean. Verified with `npm test` on `main` at `fc3e493`. **Node v25.2.1.** (TBD-14 build landed +5 tests: 102 → 107.)
- **Open PRs: 0.** This session merged **#35** (TBD-14 directory-granularity reachability code).
- Working tree clean. `src/API.md` parses (4 JSON blocks). No `src/ERD.md` (no database). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Where the `context_audit` chain stands

- **TBD-16 (`routing_drift` precision): CLOSED** — re-validated run #2, D2/D3 confirmed. Nothing outstanding.
- **TBD-14 (`orphans` directory-granularity reachability): CODE BUILT + MERGED (PR #35), still OPEN pending categorical re-validation.** The build is done and reviewed CLEAN; **landing the code does not close TBD-14.** The **only** close condition — a categorical re-validation run on the pinned nine-repo corpus — is still outstanding and is the next actionable unit.

---

## Active design doc

**`planning/designs/2026-08-25_directory-granularity-reachability-design.md`** — **approved, built, NOT yet re-validated.** Its plan (`docs/superpowers/plans/2026-08-25-directory-granularity-reachability.md`) executed this session task-by-task under TDD; code merged as PR #35.

(TBD-16's design `2026-08-24_routing-drift-precision-design.md` is built and closed. Base designs `2026-08-20_agents-md-router-recognition-design.md` and `2026-08-18_context-audit-design.md` are built.)

---

## Decisions + TBDs

### Built this session
- **TBD-14 directory-granularity reachability** — executed the reviewed plan under `superpowers:test-driven-development`. Implementation in `src/tools/context-audit/graph.ts`: a per-source `dirTargetsBySrc` record (directory targets recorded under the doc that routed them), a `docsByParentDir` index, and **directory-only, root-restricted propagation folded into the reachability DFS** — a reached document also marks reachable every in-scope doc **directly contained** in a directory it routed. `routedDirs`/`coverage.ts`/`score.ts`/`index.ts`/`underRoutedDir`/`TBD_10_WEIGHTS`/`ROUTING_LAYER_KEYS` untouched. `src/API.md` orphans sentence updated same commit (rule 8). Tests T-dir-1…5 (+5 → 107). Reviewed CLEAN (zero Critical/Important; three optional Minor notes, none actionable — the `.`→`""` repo-root-route case is already documented as no-special-handling in the design's "Deliberately skipped"). **No new decision record written — this session executed an already-decided plan; nothing new was ruled.**

### TBD-14 — the next actionable unit (Open, code landed, re-validation outstanding)
- **What remains:** a **categorical re-validation** run on the pinned nine-repo corpus — the **only** thing that closes TBD-14. Every residual orphan must classify as either **genuine-abandoned** or a **named accepted layout class** (route-to-directory-nested, convention-discovered, dated-archival). Any residual fitting neither → `/decisions`. It is **not** a numeric bar (rule 7): counting is for the record, classification is the gate. This is a calibration run in its own session, **not** a build step and **not** the README sample. Written to `planning/calibration/`.
- **`orphans` stays OUT of TBD-10 weighting** until that re-validation passes — an exclusion pending a correctness fix, not a weighting decision. Only then does `orphans` become *eligible* (eligibility only; the weight NUMBER stays deferred).

### Queue behind TBD-14
- **TBD-11** — bloat-aggregation shape. Authorised as its own loop, **unbuilt**. No design yet.
- **TBD-10 / TBD-11 / TBD-12 weight & threshold NUMBERS** — data-blocked. **Calibrate only from external hyperlink-routed repos, never from B-A-MCP's own run** (its backtick routing gives degenerate denominators). `routing_drift` is weighting-**eligible** (TBD-16 lifted its correctness-null) but the NUMBER is deferred; `orphans` becomes eligible only after TBD-14 re-validates.
- **`coverage` remains the sole load-bearing headline routing-layer sub-score** until TBD-14 (orphans) re-validates and TBD-11 (bloat shape) lands.
- **README true-sample** — gated behind the TBD-10/11/12 numbers. Not now; must be a true run.
- **TBD-2 / TBD-4 / TBD-5 / TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched.

---

## Remaining work

- **Re-validate TBD-14** (next session): a categorical re-validation run on the pinned nine-repo corpus. This is the **only** thing that closes TBD-14. The code is already on `main`.
- **TBD-11** design → build, when picked.
- The README true-sample and the TBD-10/11/12 numbers stay gated as above.

---

## Context not in the docs

- **The whole `context_audit` chain runs on one tie-breaker: visible false positive over silent false negative.** Every ratchet trip resolved that way — TBD-16's loose-C1 rejection, the CommonMark `<dest>` fix, the placeholder/bare-filename shape exclusions, TBD-14's depth (directory-only over full-subtree) and origin (root-restricted over flat). When a new choice appears, decide it on error *direction*, not on how small the affected corner is; a small corner on the silent-FN side is exactly what ships wrong because nobody is forced to look.
- **Re-validation is categorical, never a proportion.** A clean-looking headline is not a pass — every residual is named against an accepted class or it goes to `/decisions`. TBD-16 run #1 looked great yet failed the gate on 7 unnamed FPs; that is the mechanism working. The TBD-14 re-validation must anticipate four accepted residue classes (route-to-directory-nested, convention-discovered, dated-archival, genuine-abandoned) per design §3.4 — anything else is a `/decisions` item.
- **The TBD-14 build's subtle correctness point (as-built, confirmed by review):** propagation is sourced from **directory targets recorded per source doc** (`dirTargetsBySrc`), NOT from `routedDirs` (which also holds doc-parent dirs for `coverage`); and it is **folded into the DFS** so only a reached node propagates. The three counterfactuals (flat, full-subtree, all-`routedDirs`) each break a specific guard test — T-dir-4 (flat), T-dir-2 (full-subtree), T-dir-3 + the pre-existing `orphan: routed-workspace…` fixture (all-`routedDirs`). Keep all five; a green suite under a wrong implementation is the trap.

### `task-observer` was NOT invoked this session — carry to the re-val session
- **CLAUDE.md requires `task-observer` at the start of any task-oriented session; this session skipped it.** The re-validation session **must invoke `task-observer` at start** (before any work), and should also surface any observations that this build session would have logged (the TDD execution went clean — red states matched the plan's derivation exactly, no corrections — so the likely yield is low, but the skip means it was never watched). Named, not fixed.

### Three named-not-fixed PROCESS items — one family, for the observation-review session (its own session)
All three are the same root cause: **literal text handed to a shell-adjacent tool must be verified as literal, not silently transformed.** Named, not fixed; carry them across this boundary.
- **State-tagging fault** — a recorded red/green state must carry *which code-state it was measured against*.
- **`str_replace` line-wrap no-op hazard** — a single-line search-and-replace whose target wraps across two source lines matches nothing and silently no-ops.
- **Commit-message backtick shell-eval trap** — `git commit -m "…"` with backticks lets the shell command-substitute them; use `git commit -F -` / a heredoc. (Followed this session — the TBD-14 commit used `git commit -F -`.)

(The observation log holds observations 1–15 and was not touched this session.)

---

## Next-session starter

> **Re-validate TBD-14** — the directory-granularity reachability code is built and merged (PR #35, `main` `fc3e493`), but **landing the code does NOT close TBD-14**. TBD-14 stays **Open pending a categorical re-validation** run on the pinned nine-repo corpus — the only close condition. **First, invoke `task-observer` at session start** (CLAUDE.md requires it; the build session skipped it — carry that forward). Then read `CLAUDE.md`, this file, the design `planning/designs/2026-08-25_directory-granularity-reachability-design.md` (§3.3–§3.4 name the accepted residue classes), and TBD-16's re-validation records under `planning/calibration/` for the categorical-gate precedent. Confirm `git rev-parse HEAD` and `npm test` (expect **107**) before trusting any figure.
>
> Run the re-validation against the pinned nine-repo corpus and classify **every** residual orphan as genuine-abandoned or a named accepted layout class (**route-to-directory-nested**, **convention-discovered**, **dated-archival**). Write the calibration record to `planning/calibration/`. **The gate is categorical, not a proportion** — any residual fitting no class goes to `/decisions`, not into a silent pass. Only when every residual classifies does TBD-14 close; **only then** does `orphans` become *eligible* for TBD-10 weighting (eligibility only — the weight NUMBER stays deferred, data-blocked, external repos only, never B-A-MCP's own run).
>
> Standing: no threshold/weight number; branch + PR, never direct to `main`; the ratchet — a decision the design does not settle goes to `/decisions`, not into the work. Behind TBD-14: **TBD-11** (bloat shape, authorised/unbuilt). `coverage` stays the sole load-bearing headline sub-score until TBD-14 re-validates and TBD-11 lands. The three process items and the `task-observer` skip wait for a dedicated observation-review session — named, not fixed.
