# Calibration — TBD-16 re-validation run #2 (pinned nine-repo corpus) — **CLOSE SATISFIED**

**Date:** 2026-08-25
**Tool state:** `main` at the merge of PR #30 (`fix/tbd-16-shape-exclusions`) — commit `94977ec`, `npm test` 102/102, `tsc` clean.
**Purpose:** Re-run design §3.4's **categorical close condition** after the two authorized shape exclusions landed (`planning/decisions/2026-08-25_tbd-16-residual-fp-mechanisms-abc.md`). This is the run that closes TBD-16. Calibration artifact, **not** the build validation folded into PR #30, and **not** the README sample.
**Verdict:** **CLOSE SATISFIED.** All 16 residual drift findings classify — 15 into §3.5-named accepted classes, 1 a verified genuine broken route. TBD-16 → **Resolved**; D2 and D3 confirmed together (see §4).

---

## 0. Pinned corpus — no re-clone

Same nine clones under `~/dev/ba-calibration/`, pinned at the run-6 commits (carried from `2026-08-24_context-audit-run-6-nine-repo-rerun.md`; unchanged since run #1, `2026-08-25_context-audit-tbd-16-revalidation.md`). `Buddi` and `~/.claude` barred — correctness probes only. Four repos produce any drift (posthog, caveman, superpowers, icm-architect).

## 1. Before / after — both fresh this session, multiset

"Before" on the pre-exclusion tool (`e6ad7a8`); "after" on the merged shape exclusions (`94977ec`). Both executed this session on the same clones, multiset counts (obs 14).

| repo | before (#1 residue) | after (#2 residue) |
|---|--:|--:|
| posthog | 4 | 2 |
| caveman | 21 | 12 |
| superpowers | 1 | 1 |
| icm-architect | 2 | 1 |
| **total** | **28** | **16** |

## 2. The 12 dropped — each verified prose/placeholder (the zero-FN check)

The two exclusions were *scoped* to 3 targeted FPs (the `...` ellipsis and bare-filename citations #3/#4). The bare-filename rule is general, so it removed **12** findings, not 3. **The close depends on none of the extra drops being a genuine broken route.** Each was checked against its source prose:

| dropped finding | raw span | verified as prose/placeholder |
|---|---|---|
| posthog browser-tabs → `CONTEXT.md` (#3) | bare | nav-label list `(Loops, Recents, CONTEXT.md — see …)` |
| caveman `packages/cli/CLAUDE.md` → `SKILL.md` (#4) | bare | file-type mention: "pixelize … `SKILL.md` bodies" |
| icm `stages/01_.../CONTEXT.md` (ellipsis) | `...` | ellipsis placeholder for the stage name |
| caveman `caveman.md`, `-commit`, `-review`, `-stats` | bare | "each duplicated a real skill … **were removed**" |
| caveman `caveman-init.md` | bare | "`commands/` keeps one `.md`: `caveman-init.md`" |
| caveman `SKILL.md` (L291, L372) | bare | "the LLM-facing body is in `SKILL.md`" — file-type |
| caveman `packages/cli/AGENTS.md` → `SKILL.orig.md` | bare | "original kept byte-exact as `SKILL.orig.md`" |
| posthog `products/signals/skills/AGENTS.md` → `report.md` | bare | "a ported scout bundles **no** `report.md`" |

**Zero genuine broken routes among the 12.** The over-scope catch is safe: every non-resolving bare filename in the corpus is a file-type mention, historical reference, or citation — consistent with the boundary measurement (no resolving bare-filename route exists anywhere in the corpus).

## 3. The 16 remaining residuals — every one classifies

| classification | count | findings |
|---|--:|---|
| install-target (§3.5) | 6 | caveman `.github/copilot-instructions.md` ×3, `.windsurf/rules/caveman.md`, `.clinerules/caveman.md`, `skills/caveman-learn/.claude/skills/caveman-learn/SKILL.md` |
| prose-relative under a root-located router (§3.5) | 3 | caveman `caveman/SKILL.md`, `cavecrew/SKILL.md`; superpowers `evals/README.md` |
| cross-repo (§3.5) | 2 | caveman `agents/AGENTS.md`, `agents/CLAUDE.md` |
| compound/lexical placeholder (§3.5) | 1 | posthog `signals-scout-foo/SKILL.md` |
| ancestor-located prose-relative under a nested router (§3.5) | 1 | posthog `.../features/canvas/AGENTS.md` → `products/desktop/docs/CANVAS-FREEFORM-REACT-PLAN.md` |
| in-subtree exact-tail-miss under a nested router (§3.5) | 1 | icm `assets/templates/CLAUDE.md` → `setup/questionnaire.md` |
| path-shaped provenance citation (§3.5) | 1 | caveman `engine/CLAUDE.md` → `bench/agent/README.md` |
| **verified genuine broken route** | 1 | caveman `packages/agent/CLAUDE.md` → `docs/strategy/EFFICIENT_AGENT_BUILDER_SPEC.md` — prose reads "**Authority:** `docs/strategy/EFFICIENT_AGENT_BUILDER_SPEC.md`"; the file is genuinely absent (no `packages/agent/docs/strategy/`), so the router points at a missing authority doc — a real broken route, correctly flagged |

15 named §3.5 + 1 verified genuine broken = **16.** No residual fits neither. The three targeted FPs (`...` ellipsis, bare-filename #3/#4) are confirmed gone; no shape/bare leak remains. **§3.4's categorical close condition is met.**

## 4. Corrections folded in (caught, not silently absorbed)

- **Correction A — `report.md` was mislabelled in run #1.** Run #1 (`2026-08-25_context-audit-tbd-16-revalidation.md` §2) listed posthog `report.md` among "3 plausibly genuine broken routes." Its prose ("a ported scout bundles **no** `report.md`") is a file-type mention, not a route — it is prose, now correctly shape-excluded. Run #1's plausibly-genuine count was 3, should have been 2. **Run #1's outcome is unchanged** — it still had unclassifiable residuals and correctly routed to the sixth `/decisions` trip; this correction does not alter that. Recorded here as a caught correction.
- **Correction B — the "prose-relative under a root-located router" class shrank 9 → 3.** Run #1 measured 9 (all caveman root `CLAUDE.md`). Seven were bare filenames (`caveman.md`, `-commit`, `-review`, `-stats`, `-init`, `SKILL.md` ×2) and are now handled by the bare-filename shape exclusion, not the accepted class. The corrected class population is **3**: caveman `caveman/SKILL.md`, `cavecrew/SKILL.md` (path-shaped) and superpowers `evals/README.md`. §3.5 is amended to this 3-member population.

## 5. Close — TBD-16 Resolved; D2/D3 confirmed together

Per §3.4 the two surfaces are confirmed **together**, with this run as the closing evidence:

- **D2 — `routing_drift` is scored-real.** The correctness-driven null lifts; the sub-score contributes a real value to the headline again (subject to its ordinary `n === 0 → null` data contract, e.g. an all-unanchored router).
- **D3 — `routing_path_missing` stays `high`.** Confirmed never lowered; the interim `info` demotion never shipped (superseded before implementation) and is not reintroduced.

Both flip on this run. `src/TDD.md` TBD-16 row → **Resolved**. `src/API.md`'s two shape-exclusion sentences (landed in PR #30) describe the now-true behavior. **No threshold or weight number set** — `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.

## 6. Downstream

- **TBD-10** — `routing_drift` is now **weighting-eligible** (its correctness-null is lifted), but the weight **NUMBER stays deferred**; `coverage` remains the sole load-bearing headline routing-layer sub-score until TBD-14 (dir-granularity reachability) and TBD-11 (bloat-aggregation shape) land.
- **README true-sample** — still gated behind the TBD-10/11/12 numbers. Not this record.

## Non-goals

Does not set any threshold or weight number. Does not touch the accepted-FP classes' status as accepted (they need no code). Not the README sample.
