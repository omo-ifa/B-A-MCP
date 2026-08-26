# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `7a5bb28` (`feat(context_audit): ratify TBD-11/12 cutoffs + TBD-10 weights (partial) from run-7; open TBD-18 (#45)`) **at the moment this file was written.** Merging this handoff advances `main` once more — a live `git rev-parse --short HEAD` ahead of `7a5bb28` is expected; a HEAD *behind* it is wrong.
- **Merge verification (squash-aware, Obs 20).** PR #45 was **squash-merged**, so `git merge-base --is-ancestor <branch-sha> main` correctly FAILS (squash discards branch commits) — that is NOT a broken merge. Integration was verified by **content on trunk**: `TBD_10_WEIGHTS = {routing_drift:1, coverage:3, bloat:1}`, `ROUTING_LAYER_KEYS = ["routing_drift","coverage"]`, zero `TODO: TBD-11` markers, both decision records present, `npm test` 115/115 on `main`. (The old `is-ancestor <post-merge-HEAD>` check passes trivially and verifies nothing — see Obs 20.)
- **Tests:** **115 / 115 pass, 0 fail**, `tsc --noEmit` clean. Verified on `main` at `7a5bb28` post-merge. **Node v25.2.1.** (+3 from the TBD-10 build: 112 → 115.)
- **Open PRs: none** at write time (this session opens one further PR for this handoff doc).
- Working tree clean before this write. `src/API.md` parses (4/4 JSON blocks) and now describes `orphans` as reported-but-unweighted + the routing-layer guard as `routing_drift`/`coverage`. No `src/ERD.md` (no database). Context-budget ledger unchanged at **252 / ~4000** (rule 2 — schema shape untouched). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **No active design doc.** The TBD-10/11/12 NUMBERS loop was a data + `/decisions` loop (evidence: `planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md`), now landed.
- **The next build — TBD-18 (`orphans` re-base) — has NO design doc yet.** It is a real code change (the scorer must recognize the TBD-14 accepted-layout classes to net them out), so it needs `superpowers:brainstorming` → a `planning/designs/` doc before any code.

---

## Decisions + TBDs

### This session — run-7 NUMBERS ratified at `/decisions` (Gate 2, owner-ratified) and BUILT

Two decision records written: `planning/decisions/2026-08-26_tbd-11-tbd-12-cutoff-numbers-ratified.md` and `planning/decisions/2026-08-26_tbd-10-weights-partial-and-tbd-18-orphans-rebase.md`.

- **TBD-11 (bloat cutoffs) → RESOLVED / CLOSED.** `TBD_11_ROUTER_TOKEN_CUTOFF=3000` (score-neutral in-sample) and `TBD_11_CHAIN_TOKEN_CUTOFF=6000` (clean gap) ratified as decided values; `TBD_11_CHAIN_DEPTH_CUTOFF=4` **kept, flagged under-determined** (only posthog exceeds it at depth 5; zero corpus obs at depth 3–4). **Values numerically unchanged → no behaviour change, no boundary tests.** `bloat.ts` `TODO: TBD-11` markers decommissioned (top-of-file + 3 inline); constants carry ratification rationale.
- **TBD-12 → `MIN_FILES` RESOLVED (=5).** Raising it drops small-real uncovered dirs to silent FN (against the tie-breaker); `/n` already exposes thin anchors (superpowers `100/n1`). **TBD-12 STAYS OPEN** for the rest of its scope — the source-vs-test significance **basis**, `SOURCE_EXTS` (still provisional), and the still-off coverage-finding emission — its own later loop.
- **TBD-10 (weights) → PARTIAL + BUILT.** `TBD_10_WEIGHTS = {routing_drift:1, coverage:3, bloat:1}`: `coverage:3` (best discriminator), `bloat:1` (hygiene), `routing_drift:1` (**down-weighted from stub 3** — saturated ~100, floor-catcher not driver). **`orphans` NOT weighted — gated on TBD-18**: removed from the weights map AND from `ROUTING_LAYER_KEYS` (an unweighted orphans must not pass the guard into a bloat-only headline). `orphans` is still REPORTED in `subscores`. Built under TDD (+3 `score.test.ts` tests). `src/API.md` updated same commit (rule 8). Headlines recompute: superset 66→80, posthog 69→83, cal.com 60→54, superpowers 66→95, claude-mem 50→40, icm 25→50. **TBD-10 stays Open for the `orphans` weight ONLY.**
- **TBD-18 (NEW) → DIRECTION RESOLVED (record-only).** Re-base the `orphans` sub-score onto genuine-abandoned rot (net out the TBD-14 accepted classes). Bound-with-low-weight rejected (leaves it measuring style). **No code this session — `orphans` scoring untouched; it is simply excluded from the headline until this builds.** TBD-18 stays Open (build pending).

Code review (PR #45): **clean** — one Minor stale-comment nit (the `headlineScore` guard docstring still listed orphans), fixed in the same PR; suite re-verified 115/115.

### Still deferred / blocked

- **TBD-2 / TBD-4 / TBD-5 / TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched.
- **TBD-15** — v1.1 `root.method` follow-ups. Open, untouched. **TBD-17** — Resolved (add no new router syntax in v1).

---

## Remaining work

- **TBD-18 — the `orphans` re-base build is the next actionable unit, and it is now the last thing gating the README true-sample** (the README needs the full TBD-10 weight vector, whose only missing entry is the `orphans` weight, which is gated on TBD-18). It is a real code change: `superpowers:brainstorming` → design → TDD → re-validate on the pinned corpus. The hard part is recognizing the TBD-14 accepted-layout classes *in the scorer* (they were classified by hand/mechanism in the TBD-14 re-validations, not by `graph.ts`).
- **TBD-10** — set the `orphans` weight once TBD-18 lands.
- **TBD-12** — the source-vs-test significance basis (its own loop) remains.
- **README true-sample** — still gated (on TBD-18 → the full weight vector). Must be a true run.
- **`task-observer` backlog: now 20 OPEN**, `last-review-date.txt` = `never`. This session logged **Obs 19** (validate calibration instrumentation by re-deriving the shipped metric — `bloatMatch` ×9) and **Obs 20** (squash merges break branch-SHA ancestry verification; verify content on trunk instead). A dedicated review session is owed (load `task-observer` `references/weekly-review.md`); carries the three earlier named process items + Obs 18/19/20.

---

## Context not in the docs

- **The calibration clones are intact at `~/dev/ba-calibration/`** at the pinned run-6 commits (verified clean). No re-clone is needed to re-audit; `runContextAudit({ path })` read-only per clone is the harness.
- **run-7's headline recompute is the calibration made visible.** Under the ratified weights, `coverage` dominates (weight 3), `bloat` is hygiene (1), `routing_drift` is a mild floor-catcher (1, e.g. icm's drift 0 pulls icm to 50), and `orphans` no longer craters headlines for layout reasons (superset 66→80). This is the intended de-layout-domination effect and the reason TBD-18 must land before `orphans` re-enters the headline.
- **`CHAIN_DEPTH=4` is the one ratified cutoff the corpus does not truly constrain** (single obs at depth 5, none at 3–4). A deeper/larger corpus would sharpen only this one number; the others are settled.
- **The house tie-breaker still governs the open pieces:** visible FP > silent FN. It is why `MIN_FILES` was NOT raised, why `ROUTER_TOKEN` stays low, and why TBD-18's re-base must not silently swallow genuine-abandoned rot.
- **Merge-verification method now depends on merge strategy (Obs 20):** squash → verify content on trunk + tests; fast-forward/true merge → `git merge-base --is-ancestor <branch-sha> trunk`. Do not check the post-merge HEAD against trunk — it passes trivially.

---

## Next-session starter

> **Build TBD-18 — re-base the `orphans` sub-score onto genuine-abandoned rot** (net out the TBD-14 accepted-layout classes so `orphans` scores routing failure, not layout style). This is the last piece gating the `orphans` TBD-10 weight and thus the README true-sample. **First, invoke `task-observer` at session start** (CLAUDE.md requires it) and surface that the backlog is **20 OPEN, never reviewed** (offer the review; don't gate work on it). Then read `CLAUDE.md`, this file, `src/CONTEXT.md`, `src/TDD.md` (the **TBD-18** row + the TBD-14 close records it points to), `planning/decisions/2026-08-26_tbd-10-weights-partial-and-tbd-18-orphans-rebase.md`, and the TBD-14 re-validation-run-2 calibration doc (the accepted-class taxonomy the re-base must recognize). Confirm `git rev-parse HEAD` (≥ `7a5bb28`) and `npm test` (expect **115**) before trusting anything. **Read live stub/constant values from source**, never from a tracker row.
>
> This IS a code build (unlike the numbers loop). Start with **`superpowers:brainstorming`** — the core design question is how the scorer recognizes the TBD-14 accepted classes (skill discovery, agent-runtime config, component-manifest content, test-harness fixtures, route-to-dir-nested, dated-archival) *at scoring time* in `graph.ts`, when those classes were established by hand/mechanism in the re-validation runs, not by code. Keep the standing tie-breaker (visible FP > silent FN): the re-base must NOT silently swallow the 20 genuine-abandoned orphans. Route any decision the design doesn't settle to **`/decisions`** (Gate 2). Then write the design to `planning/designs/`, turn it into a plan with **`superpowers:writing-plans`** (plan-document-reviewer checks it), build under **`superpowers:test-driven-development`**, run **`superpowers:requesting-code-review`**, and land via **`superpowers:finishing-a-development-branch`** — **branch + PR, never direct to `main`.** After a **squash** merge verify **content on trunk + tests**, not branch-SHA ancestry (Obs 20). `src/API.md` updates in the same commit as any tool-schema change (rule 8 — the `orphans` semantics description will change); re-measure the ledger if the surface changes (rule 2). When TBD-18 lands + re-validates, return to **`/decisions`** to set the `orphans` weight in `TBD_10_WEIGHTS`, then the README true-sample.
>
> **Housekeeping owed, its own session:** the **`task-observer` backlog review** (20 OPEN, never reviewed) carrying the three named process items + Obs 18/19/20.
