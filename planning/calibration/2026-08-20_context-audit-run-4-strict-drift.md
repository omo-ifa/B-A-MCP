# context_audit — calibration run 4 (five repos, strict routing-path drift)

**Date:** 2026-08-20
**Tool commit:** `da0f74a` (main — four sub-scores + router-path drift with the strict routing-path definition + per-router/chain bloat)
**Node:** v25.2.1 · **`calibrated`:** `false` (stubs active) · **No threshold resolved.**

Follows run-3 (`2026-08-20_context-audit-run-2-post-parser-fix.md` was run-2; run-3 was the pre-strict code-pass run, superseded here). The only change run-3 → run-4 is the **strict routing-path definition** (`isRoutingPathShape`): a non-resolving router backtick is a broken route only if it ends `.md` and has no glob `* { }`, home `~`, env `$`, package-scope `@`, whitespace, or leading dash.

---

## Run-2 → run-3 → run-4 (headline + sub-scores)

| Repo | r2 | r3 | **r4** | routing_drift | drift split md/path | coverage | orphans | bloat | headline |
|---|:--:|:--:|:--:|---|:--:|---|---|---|:--:|
| superpowers | 63 | 59 | **64** | 75 / n4 | 0 / 1 | 100/n1 | 0/n61 | 90/n1 | 64 |
| caveman | 75 | 51 | **62** | 90 / n280 | 0 / 28 | 89/n35 | 25/n105 | 0/n23 | 62 |
| claude-mem | 38 | 18 | **49** | 100 / n1 | 0 / 0 | 0/n50 | 0/n61 | 90/n1 | 49 |
| task-observer | null | null | **null** | null / n0 | 0 / 0 | null/n0 | null/n0 | null/n0 | null |
| icm-architect | null | 23 | **23** | 0 / n2 | 0 / 2 | null/n0 | null/n0 | 90/n2 | 23 |

- **coverage is byte-identical to run-3** on all five (the strict definition gates only the drift *emit*; the resolve census is untouched, so directory/`.md` routes still feed coverage/reachability). No regression.
- **task-observer headline `null` is correct** (0 significant directories = nothing to route). The worst case — no routers **+** a significant dir — scores 0, both locked with tests.

## Drift residue (OPEN item — recorded per repo, not solved)

The strict definition took `routing_path_missing` from run-3's noisy counts to:

| Repo | run-3 path_missing | **run-4 (strict)** | what the residue is |
|---|:--:|:--:|---|
| superpowers | 2 | **1** | `evals/README.md` — plausibly a genuine missing route |
| caveman | 160 | **28** | mixed: `.md` (bare literal ×3), `agents/AGENTS.md`, `agents/CLAUDE.md`, bare skill filenames (`caveman-commit.md`, …), `.github/copilot-instructions.md` |
| claude-mem | 5 | **0** | (all were non-routes) |
| icm-architect | 13 | **2** | `assets/templates/…/CONTEXT.md`, `…/questionnaire.md` — **accepted template FP** (below) |
| task-observer | 0 | **0** | no routers |

**caveman's 28 needs a second pass** — a bare `.md` literal is obviously not a route; the `AGENTS.md`/bare-skill cross-references may be real broken routes or cross-dir examples. **This is not decided on one repo's evidence.** Left open for a later pass.

## Recorded now (invisible later if not written down)

- **icm-architect's 2 are a known, accepted false positive on a template repo** — its template routers intentionally point at files that don't exist yet. Do **not** re-diagnose as a bug. (decision: `planning/decisions/2026-08-20_router-path-drift.md`.)
- **caveman is disproportionately shaping two open TBDs at once.** It is the top-end datapoint for **TBD-11** (23 routers, `bloat` saturates to **0**) *and* the noisiest **drift** residue case (28). When TBD-10/11 numbers get set, its outsized influence on both must be visible, not silently baked in.
- **All drift signal came from the backtick rule.** Across all five repos, broken **markdown** links in routers = **0**. `routing_drift` is only non-trivial because of `routing_path_missing`; without it the sub-score is structurally incapable of firing (routers route via backtick, not markdown links).

## TBD status — unchanged (all DEFERRED, rule 7)

No threshold set. TBD-10 (weights over four sub-scores), TBD-11 (per-router/chain cutoff numbers), TBD-12 (`MIN_FILES`) all remain data-blocked. The instrument is now materially sharper (real backtick routing assessed; drift has teeth without dominating on noise), but the numbers still wait for a broader, less single-author-skewed sample and the caveman-residue second pass.
