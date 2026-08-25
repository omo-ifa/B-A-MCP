# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-25

- **`main` HEAD:** `458fef5` (`docs: close TBD-16 — re-validation run #2 satisfied, D2/D3 confirmed (#31)`) **at the moment this file was written.** This file cannot record the commit that contains it: merging it advances `main` once more. **A live `git rev-parse --short HEAD` ahead of `458fef5` is expected and correct** — what would be wrong is a HEAD *behind* it (a stale checkout).
- **Tests:** **102 / 102 pass, 0 fail**, `tsc` clean. Verified with `npm test` on `main` at `458fef5`. **Node v25.2.1.**
- **Open PRs: 0.** This session merged **#30** (the two shape exclusions) and **#31** (the TBD-16 close docs). (Earlier in the chain: #25–#29.)
- Working tree clean. Merged topic branches deleted on merge.

---

## Headline: **TBD-16 is RESOLVED.** `routing_drift` precision is done and re-validated.

The `context_audit` `routing_drift` precision fix — the whole design→six-`/decisions`-trips→build chain — **closed this session** under design §3.4's categorical gate. Nothing about it is outstanding.

---

## Active design doc

**`planning/designs/2026-08-24_routing-drift-precision-design.md`** — **built, merged, and its TBD (TBD-16) CLOSED.** Amended six times across the chain; §3.5 now names six accepted-FP classes and records the two shape exclusions as **handled**.

Base designs, both built: `2026-08-20_agents-md-router-recognition-design.md` (PR #14), `2026-08-18_context-audit-design.md`.

---

## Decisions + TBDs

### Resolved this session
- **TBD-16 → Resolved (2026-08-25).** Closing evidence: re-validation **run #2** (`planning/calibration/2026-08-25_context-audit-tbd-16-revalidation-run2.md`). The sixth `/decisions` trip (`planning/decisions/2026-08-25_tbd-16-residual-fp-mechanisms-abc.md`) named four accepted §3.5 FP classes and authorized two shape exclusions; the exclusions were built (**PR #30**) and re-validated (**PR #31**).
  - **Run #2 result:** drift residue **28 → 16**, both states fresh this session (multiset). All 16 classify — 15 named §3.5 classes + 1 verified genuine broken route (caveman `EFFICIENT_AGENT_BUILDER_SPEC.md`, an absent "Authority:" doc). The two exclusions removed **12** findings (more than the 3 scoped), and **every one was verified prose/placeholder against its source prose — zero false negatives.** That zero-FN check is what made the over-scope catch safe.
  - **D2 + D3 confirmed together:** `routing_drift` is **scored-real** (its correctness-driven null is lifted), `routing_path_missing` stays **`high`**.
  - **Two run-#1 corrections folded in** (caught, not silently absorbed): (A) `report.md` was mislabelled "plausibly genuine broken" in run #1 — it is prose ("a scout bundles no `report.md`"), correctly shape-excluded now; run #1's outcome is unchanged. (B) the "prose-relative under a root-located router" §3.5 class shrank **9 → 3** (7 were bare filenames, now shape-excluded); corrected members: caveman `caveman/SKILL.md`, `cavecrew/SKILL.md`, superpowers `evals/README.md`.

### Open TBDs
- **TBD-10** — sub-score → headline weight NUMBERS. Still Open, data-blocked. **`routing_drift` is now weighting-eligible** (its correctness-null lifted with TBD-16's close), **but the weight NUMBER stays deferred.** `coverage` remains the **sole load-bearing** headline routing-layer sub-score until TBD-14 and TBD-11 land. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.
- **TBD-14** — orphans dir-granularity reachability. Authorised as its own build loop, **not built. Next candidate work.**
- **TBD-11** — bloat-aggregation shape. Authorised, **not built. Next candidate work.**
- **TBD-12** — coverage `MIN_FILES` / significance numbers. Open, data-blocked.
- **TBD-2, TBD-4, TBD-5, TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched this session.

---

## Remaining work

- **The two authorised-but-unbuilt loops are the next candidate work:** **TBD-14** (directory-granularity reachability for `orphans`) and **TBD-11** (bloat-aggregation shape). Each is its own design → `superpowers:writing-plans` → `superpowers:test-driven-development` → reviewers → `superpowers:finishing-a-development-branch` loop. Neither is started; pick either.
- **README true-sample** — gated behind the `TBD-10/11/12` NUMBERS. **Not now.** Must be a true run once those numbers exist; the re-validation records are explicitly not the README sample.
- **`override_log`** — still the next new tool once `context_audit` stops moving (no phase shift). `doc_drift` scope is TBD-9.
- **Schema-of-record verified:** `src/API.md` matches the code as committed (4 JSON blocks parse; the two shape exclusions carry their API.md sentence from PR #30, rule 8). No `src/ERD.md` (no database). `prompts/` untouched this session → `.claude/commands/` not regenerated (rule 1).

---

## Context not in the docs

- **The shape exclusions are broader than they look, and that is fine.** The bare-filename exclusion removes *every* non-resolving bare `.md` backtick in a router, not just the two scoped citations — in run #2 it caught 12 findings. That is safe **only because** a resolving span is already an edge by existence (resolve-only) and never reaches the shape test, so the exclusion can only ever silence prose. Every drop was individually verified prose before the close. If a future repo genuinely routes via a bare filename, that is a new `/decisions` item, not a silent miss to assume away.
- **`isRoutingPathShape` is the routing-path *definition*.** It now carries: no-whitespace, no leading `-`/`@`, no glob/home/env (`* ~ $`), no placeholder token (`hasPlaceholderToken`), **no `...`-ellipsis segment, no bare filename (must contain `/`)**, ends `.md`, final segment not a bare extension. It gates the **backtick** branch only; the markdown branch uses `isMarkdownPlaceholder` + `stripDestDelimiter`. Keep the two definitions separate.
- **§3.5 is the re-validation contract.** Six accepted-FP classes are named there (masked-rot; prose-relative-under-root, now 3-member; install-target; cross-repo; compound placeholder; path-shaped citation; ancestor-located and in-subtree-exact-tail-miss under nested routers). Any future re-validation classifies residue against that list or bounces to `/decisions`. Do not read a clean headline as a pass — classification is the gate, not a proportion.

### Three named-not-fixed PROCESS items — observation-review-session work (must survive this boundary)
- **The state-tagging fault.** A recorded red/green state or claimed observation must carry *which code-state it was measured against* — this chain twice recorded a red state against the wrong implementation state and had to re-derive.
- **The `str_replace` line-wrap no-op hazard.** A single-line search-and-replace whose target text wraps across two source lines matches nothing and silently no-ops; an edit that "succeeds" without changing anything is invisible.
- **The commit-message backtick shell-eval trap.** A `git commit -m "…"` message containing backticks lets the shell command-substitute them, silently stripping content from the message (hit once this session; the docs content was unaffected, only the message). Use a heredoc (`git commit -F -`) or single quotes for messages with backticks.

(The observation log itself was not touched beyond this naming; it holds observations 1–15.)

---

## Next-session starter

> `context_audit`'s `routing_drift` precision (TBD-16) is **closed and re-validated** — do not reopen it. The next candidate work is one of the two authorised-but-unbuilt loops: **TBD-14** (directory-granularity reachability for `orphans`) or **TBD-11** (bloat-aggregation shape). Read `CLAUDE.md`, this file, `src/TDD.md` (the TBD-14 / TBD-11 rows and their decision records), and `planning/decisions/2026-08-24_orphans-routes-to-dirs-not-docs.md` (TBD-14's cause analysis) / `2026-08-24_tbd-11-bloat-aggregation-shape.md` (TBD-11). Confirm `git rev-parse HEAD` and `npm test` (expect 102) before trusting any figure.
>
> Pick one loop. It needs a design doc first (WHAT & WHY) if one is not already written — brainstorm with `superpowers:brainstorming`, gate the decisions with `/decisions`, write the design with `/design-doc`. Then `superpowers:writing-plans` → the plan-reviewer → build under `superpowers:test-driven-development` (or `superpowers:subagent-driven-development`) → `superpowers:requesting-code-review` → `superpowers:receiving-code-review` → `superpowers:finishing-a-development-branch`. `src/API.md` updates in the same commit as any tool/schema change (rule 8); re-measure the context-budget ledger only if the tool description/schema changes (rule 2).
>
> Standing: no threshold or weight number (TBD-10/11/12 deferred; `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` not edited); branch + PR for anything code-touching, never direct to `main`; ratchet — a decision the design does not settle goes to `/decisions`, not into the build. The README true-sample stays gated behind the TBD-10/11/12 numbers — not yet. Three process items wait for the next observation-review session: state-tagging, `str_replace` line-wrap no-op, commit-backtick shell-eval — all named-not-fixed.
