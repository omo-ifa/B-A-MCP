# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-25

- **`main` HEAD:** `12da257` (`plan: TBD-16 routing_drift precision — revision 2 (re-reviewed, fixes applied) (#21)`). Verified with `git rev-parse HEAD`.
- **Tests:** **76 / 76 pass, 0 fail**, `tsc` clean. Verified with `npm test` on `main` at that HEAD. **Node v25.2.1.**
- **Open PRs: 0.** #17–#22 all merged this session.
- **`src/**/*.ts` changed since the design landed (`9869d22..HEAD`): 0 files.** No production code has been written in this entire chain.
- Working tree clean. Several merged topic branches remain locally (`decisions/*`, `ratchet/*`, `plan/*` was deleted on merge) — safe to prune, none carry unmerged work.

---

## Where TBD-16 stands: **plan landed, cleared for execution**

The `routing_drift` precision fix (**TBD-16**) has completed the full gate chain and is ready to build. **Execution is the next action and is the first `src/**/*.ts` write in the chain.**

**On `main`, all verified present this session:**

| Artifact | Path |
|---|---|
| **Implementation plan (revision 3)** | `docs/superpowers/plans/2026-08-24-routing-drift-precision.md` |
| **Design (amended ×3)** | `planning/designs/2026-08-24_routing-drift-precision-design.md` |
| Gate 2 — interim disposition (D1–D5) | `planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md` |
| Gate 2 — tier-2 scope + placeholder globality | `planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` |
| Gate 2 — D2/D3 superseded pre-implementation | `planning/decisions/2026-08-24_d2-d3-superseded-before-implementation.md` |
| Gate 2 — `<token>` precedence + discriminator | `planning/decisions/2026-08-25_placeholder-vs-commonmark-destination-precedence.md` |
| Calibration run-6 (the evidence base) | `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` |

Also landed this session, **not** part of TBD-16's build: `2026-08-24_orphans-routes-to-dirs-not-docs.md` (TBD-14), `2026-08-24_tbd-11-bloat-aggregation-shape.md` (TBD-11), `2026-08-24_tbd-17-no-new-router-syntax-v1.md` (TBD-17, **Resolved**).

**Review history:** the plan went through **four** review cycles — REJECT → APPROVE WITH FIXES → FIXES INCOMPLETE → **CLEAN**. Cycle 4 verified on-machine: red state reproduces exactly, no `&&` short-circuit, T2d/T2e non-vacuous under mutation, discriminator matches every ruling row, location-gate reds hold both directions, counts reproduce. **No scope question remained open.**

### The report contract execution must satisfy

Landing the code is not enough — it must be *shown* to do what four design cycles predicted:

1. **Counts `76 → 86 → 92 → 94`** reproduced on the **real repo**, not a scratch tree.
2. **Before/after audits of the four wild repos that produce drift** (posthog, caveman, superpowers, icm-architect), on the **pinned nine-repo corpus** — clones under `~/dev/ba-calibration/`, verified live at the run-6 commits: `superset 18fc2c6 · posthog 7bd2689 · cal.com 176037d · Ghost 0cd3280 · superpowers b36e082 · caveman a42ef76 · claude-mem e2d1df5 · one-skill-to-rule-them-all 281f134 · icm-architect b20fb45`. **Do not refresh them** — the corpus is pinned so the tool is the only variable.
3. **The drift split reproduced: 17 of 26 prose-relative false positives fixed** (all posthog's, nested routers), **9 given back** (all caveman's root `CLAUDE.md`, the §3.5 named accepted-FP class).
4. **`Buddi` and `~/.claude` are barred from threshold reasoning** — correctness probes only, per `2026-08-24_tier-2-scope-and-placeholder-globality.md` D4.

**TBD-16 does not close when the code lands.** It closes on re-validation against the pinned corpus under §3.4's **categorical** close condition: every residual drift finding must be classifiable into a §3.5-named out-of-scope class or be a verified genuine broken route. Any finding fitting neither → `/decisions`.

---

## Decisions + TBDs

**Resolved this session:** TBD-13 (Status column corrected — its Resolution text had said Resolved since 2026-08-20), TBD-17 (no new router syntax in v1).

**Open — full status in `src/TDD.md` (canonical):**

- **TBD-16** — Open; plan landed, awaiting execution + re-validation.
- **TBD-10** (weights) — Open, **blocked on TBD-16**. Two sub-scores are excluded from the composite pending correctness fixes: `routing_drift` (until TBD-16 lands and re-validates) and `orphans` (until dir-granularity reachability lands). With `bloat` shape-blocked too, **`coverage` is currently the only routing-layer sub-score eligible to carry the headline** — a narrowness to watch.
- **TBD-11** (bloat cutoffs) — Open; data unblocked, **shape re-blocked** (flat-sum aggregation degenerates on router count; `INLINE_RATIO_CUTOFF` flagged for re-derivation). Re-work authorised as its own loop.
- **TBD-12** (`MIN_FILES`) — Open; best data yet (0 → 1 819 significant dirs), not decided.
- **TBD-14** (orphan scope) — Open; cause identified as routes-to-directories-not-documents. Dir-granularity reachability authorised as its own loop.
- **TBD-15** — Open, v1.1, unchanged.
- **TBD-2 / TBD-4** — Open, still gate `THIRD_PARTY_NOTICES.md` (release-blocking). TBD-3, TBD-5, TBD-8, TBD-9 unchanged.

**No threshold number was set anywhere this session. `TBD_10_WEIGHTS` and `ROUTING_LAYER_KEYS` in `src/tools/context-audit/score.ts` were never edited.** Rule 7 intact.

---

## PENDING — two process findings that must survive this context boundary

**Not fixed, not logged.** They belong to the observation-review session; named here only so they are not lost.

1. **The state-tagging fault.** A recorded actual must carry the state it was captured in. This fault class recurred **four times** in one chain, always the same shape — verification that ran, but verified the wrong thing: (i) a red state predicted rather than executed; (ii) `&&` short-circuiting so a later test file never ran at the red state; (iii) a real number recorded against a *different* state than the one it was written under; (iv) an ordinal carried forward from an earlier revision. Each was caught only by an independent reviewer re-running it.

2. **The `str_replace` line-wrap no-op hazard.** A single-line search-and-replace against prose that wraps across two source lines silently succeeds-as-no-op. Hit during this chain's plan edits and independently by a reviewer's first pass. Needs a durable rule: verify the match spans what you think it spans, or anchor on a single line.

---

## Remaining work, in order

1. **Execute the TBD-16 plan** — first code write in the chain. Sequential TDD build (walk → graph → score order; do **not** parallelize the red/green cycle), then parallel read-only wild-repo audits, then code reviewers, then `superpowers:finishing-a-development-branch`.
2. **Re-validate against the pinned nine-repo corpus** — the calibration run that closes TBD-16. **Not** the README sample.
3. **Then** the authorised follow-on loops: TBD-11 bloat-aggregation shape, TBD-14 dir-granularity reachability.
4. **Then** TBD-10/11/12 numbers, which have been deferred through six calibration runs.
5. **Then** `override_log` (Roadmap #2), `doc_drift` (TBD-9), the `.claude/commands/` generator, `npm publish` dry-run.
6. **Legal (release-blocking):** TBD-2 (caveman path-scope + commit pin) and TBD-4 (ICM paraphrase, the product owner's call) still gate the notices file.

---

## Context not in the docs

- **The ratchet earned its keep four times.** Four questions reached `/decisions` only because a gate refused to decide them inline: the drift-null denominator, the root-router subtree bound, placeholder globality, and the `<token>` precedence collision. Each would have shipped wrong. **If execution surfaces a fifth, stop and take it to `/decisions` rather than deciding it in code.**
- **Three constraints are individually load-bearing** — any one implemented backwards ships the fix wrong. They are stated in the design and repeated in the plan's Global Constraints; the execution prompt repeats them again deliberately.
- **`isRoot` is a naming trap.** In this codebase it means *"is a router doc," at any depth* — it is **not** about location, and it already gates the backtick branch. Tier 2's exclusion keys on `relPath` containing no `/`. Implementing it as `isRoot` makes tier 2 never fire and silently deletes the whole fix.
- **caveman remains disproportionately influential** — the top-end router-count case for TBD-11 *and* one of the two drift-residue repos for TBD-16. Keep its influence visible, never silently baked in.
- **`index.ts` is context-budget-frozen (rule 2).** The TBD-16 plan does not touch it, so the ledger is a verified no-op.

---

## Open overrides

None. All 2026-08-24/25 decisions were made by the product owner and recorded in `planning/decisions/`.
