# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-27

- **`main` HEAD:** `507c646` (`docs: add package README with a live context_audit true-sample (#57)`). Working tree **clean**. Branch `main`. (This session's chain on main: TBD-18/19/20 `ab454bf`/#53 → handoff `3c1c9ad`/#54 → TBD-10 orphans weight `b79fcb8`/#55 → handoff `e250ba0`/#56 → README `507c646`/#57.)
- **Tests:** **131 / 131 pass**, `tsc --noEmit` clean, **Node v20+** (engines floor; developed on v25.2.1). No test change since the TBD-10 build; the README is docs-only.
- **README:** created and merged (#57, owner-approved). Package README for `b-a-mcp` with a verbatim self-audit `context_audit` sample (caveat intact). Open follow-ups the owner may still want (from the PR): a brand-voice pass, a check of the gate-delivery framing, and it is pre-publish (`npm install` line correct once released).
- **Merge verification (Obs 20):** PR #53 landed by **squash**; verified by **content on trunk** (the 3-arg `isRouteToDirNested`, `VERSION_BASENAME`, the `dirTargets` `''` filter, and the API.md `tight dated/versioned-archival` rename all present; the two new `planning/` docs exist; suite re-run on `main` = 130) — never by branch-SHA ancestry (`--is-ancestor` fails by design on a squash).
- **Open PRs: none.** `feat/tbd-19-20-detector-basis` merged and deleted.
- `src/API.md` parses (**4/4** JSON blocks) and matches the code (documents `stats.genuine_abandoned_count`, the four accepted-layout classes incl. `tight dated/versioned-archival`, and the reconstruction identity). No `src/ERD.md` (no database). **Context-budget ledger = 252 / ~4000** (rule 2 — re-measured this session, unchanged; the D1/D4 changes are internal to `buildGraph`/`accepted-layout`, no tool-definition or `outputSchema` change). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **TBD-18 — `orphans` genuine-abandoned re-base:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` — **approved + BUILT + CLOSED.** Amended this session (§D1 to the nearest-routing-known-ancestor rule, §D4 to the structural version-shape, §5 table, §6.2, §7, §9, and the new edge case B). Its §6 close condition is now **satisfied** (see re-validation below).
- **Plan (executed):** `docs/superpowers/plans/2026-08-26-tbd-19-20-detector-basis.md` — 3 TDD tasks + verify, executed inline; Task 2 carries a "superseded at re-validation" note (the straight `dirTargets` swap was refined to the two-set rule).
- **Re-validation record:** `planning/calibration/2026-08-26_context-audit-tbd-19-20-revalidation.md` — the categorical close run (verdict: **CLOSE SATISFIED**).

---

## Decisions + TBDs

### Resolved this session

- **TBD-19 (D1 basis) — Resolved.** Decision `planning/decisions/2026-08-26_tbd-19-tbd-20-d1-basis-d4b-disposition.md` (§19.1–19.3 + "Re-validation finding"). D1 re-based off the over-broad `routedDirs`. The pre-registered straight swap to `dirTargets` **re-validated to a second silent FN** (a file-parent-parented doc matched a distant `dirTargets` ancestor through intervening file-parents — the live posthog PRDs, +84 `docs/internal/**`). Shipped rule: **nearest-routing-known-ancestor**, `isRouteToDirNested(rel, routedDirs, dirTargets)` nets iff the first ancestor in `routedDirs` is a strict-ancestor dir-target; root `""` filtered from `dirTargets`.
- **TBD-20 (D4b disposition) — Resolved.** Same decision record (§20.1–20.3). Dropped the `plans/`/`CHANGELOG/` directory-segment convention (a confirmed silent-FN vector — live PRDs) for a structural version-shaped-basename net `^v?\d+\.\d+(\.\d+)+$`. `src/API.md` class-name phrase → `tight dated/versioned-archival` (rule 8, same commit).
- **TBD-18 — Resolved (close condition met).** The re-validation SATISFIED §6: fidelity 9/9, reconstruction 9/9, all **20/20** canonical genuine survive (MSW counted), the **32** D4b version-shape nets are all superset `CHANGELOG/<semver>.md` archives, both live posthog PRDs counted; orphan population unchanged at **1 077** (467 genuine + 610 netted). **`orphans` is now weighting-eligible.**
- **task-observer Obs 23 + 24 logged** (`~/.claude/projects/<id>/skill-observations/log.md`, both OPEN): #23 — a design's "structural / no silent-FN" claim is only as strong as the exact set the predicate keys on (name the set, not the concept); #24 — fixing one false-accept by replacing a predicate's set can delete a guard that prevented a *different* false-accept — re-validate both directions. Backlog now **3 OPEN** (22, 23, 24).

### Resolved this session (cont.)

- **TBD-10 `orphans` weight — Resolved (provisional).** Decision `planning/decisions/2026-08-26_tbd-10-orphans-weight.md` (owner-ratified NUMBER, rule 7). `orphans:1` added → `TBD_10_WEIGHTS = {routing_drift:1, coverage:3, bloat:1, orphans:1}`; `"orphans"` added to `ROUTING_LAYER_KEYS`. orphans discriminates (corpus 31–92) so it earns weight; 1 (below `coverage:3`) bounds the §4-gap downward-bias headline pull (~±8). **Provisional — raise-eligible when the three §4-gap `/decisions` items land** (ceiling is §4-gap detection, not signal quality). Built under TDD (131/131), API.md same commit (rule 8), ledger 252 (rule 2). Headlines recompute (superset 80→72, caveman 89→83, claude-mem 40→45); end-to-end verified on the production path.

### Open TBDs

- **TBD-10 — stays Open ONLY for the provisional→final `orphans` raise**, gated on the three §4-gap `/decisions` items (design §9). `coverage:3`/`bloat:1`/`routing_drift:1`/`orphans:1` are the current weights; only the `orphans` raise is pending. The headline weight vector is otherwise **complete**.
- **§4-gap `/decisions` items (design §9):** component-manifest detection, test-harness-fixture detection, bare-`docs/**` disposition — each its own future ruling. **Design §9 item 6 (new):** the D1 nested-under-unreached-directory-target residual silent FN (edge case B) — accepted in v1 (pre-existing, empirically clean, still a visible `orphan` finding); the fix is reached-source-restricted `dirTargets`; re-open only if a corpus surfaces a real casualty.
- **TBD-12** — source-vs-test significance **basis**, `SOURCE_EXTS`, coverage-finding emission still open (`MIN_FILES=5` resolved).
- **TBD-2 / TBD-4 / TBD-5 / TBD-9 / TBD-15** — packaging / notices / pricing / doc_drift scope / v1.1 root.method. Open, untouched.

---

## Remaining work

- **`override_log` — the next deliverable (owner-chosen 2026-08-27; deferred to a NEW session for clean context).** Roadmap tool #2, the "differentiation hook," described as *largely template generation from the guidance-with-override model* (`planning/Roadmap.md`). No design doc yet (`src/API.md` tools table: "none yet"). It is **free/keyless** (rule 3 — never a key check, never B&A infrastructure). This is a full feature loop — start it fresh (see the next-session starter). `context_audit` is done and should not be reopened for this.
- **§4-gap `/decisions` items (design §9)** — component-manifest, test-harness-fixture, bare-`docs/**` detection. Each tightens the `orphans` sub-score and is the trigger to raise the provisional `orphans:1`. Lower priority than `override_log`; a `context_audit` refinement, not a new tool.
- **`doc_drift`** — roadmap tool #3, least-bounded (TBD-9); may cut to Phase 2 if it resists.
- **Phase-1 release** — `LICENSE` + `THIRD_PARTY_NOTICES` final + `npm publish` dry-run. **Blocked on TBD-2 / TBD-4** (bundled-component license confirmations + the ICM paraphrase call — owner rulings / external confirmation). Not fully autonomous.
- **Docs:** all current (API.md 4/4, ledger 252, `src/TDD.md` TBD-10/18/19/20 updated, `planning/Roadmap.md` status line updated, README on trunk). Nothing outstanding.

---

## Context not in the docs

- **The calibration corpus is intact at `~/dev/ba-calibration/`** at the pinned run-6 commits (verified unchanged this session): superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill `281f134`, icm-architect `b20fb45`. The re-validation harness (`tbd19-20-revalidation.mjs`) lived in the session scratchpad; reproduction steps + detector totals are in the calibration doc appendix. It classifies each orphan with the exported detectors under the **new** signatures — `isRouteToDirNested(rel, g.routedDirs, g.dirTargets)` and `isAcceptedLayout(rel, {routedDirs, dirTargets, skillDirs})`.
- **Why the two-set D1 is correct and complete (review #2):** the nearest-routing-known rule nets a **strict subset** of the approved `dirTargets` swap, so it cannot add an over-net the swap lacked; `dirTargets ⊆ routedDirs` holds by construction (every dir-target is added to both in `recordResolvedTarget`), so the `routedDirs` scan can never skip a genuine dir-target. Both failure directions in the netting path are visible FPs, except the one accepted residual (edge case B), which still emits a visible `orphan` finding.
- **The 86→4→206 posthog swing:** the old `routedDirs` D1 reported posthog genuine=86 (self-consistent but netting MSW-class docs); the straight `dirTargets` swap collapsed it to 4 (netting the PRD/`docs/internal` class via distant ancestors — the silent FN); the shipped two-set rule settles at 206 (counting the MSW-class docs the old form mis-netted). Higher genuine = the safe (visible-FP) direction; `orphans` carries no weight so zero headline impact.
- **`genuine_abandoned_count` is far above the ~20 true-abandoned (467 corpus-wide) by design** — the detectors deliberately leave the §4-gap classes counted (visible FP). That residual is the input to the TBD-10 weight decision, not a bug.

---

## Next-session starter

> **Build `override_log` — the next free tool (roadmap #2, the differentiation hook).** Fresh session by design (clean context for a full feature loop). Read `CLAUDE.md`, this file, `WORKFLOW.md`, `planning/Roadmap.md` (tool ordering + the `override_log` one-liner), `src/CONTEXT.md` (conventions + the context-budget ledger), and `src/API.md` (the MCP surface + how `context_audit` is shaped — mirror its patterns: structured-error envelope, `{score/subscores/findings/stats/rendered}`-style result, read-only, tool-owns-rendering). Confirm `git rev-parse HEAD` (`507c646`) and `npm test` (expect **131**) first.
>
> **`override_log` is FREE and keyless (rule 3)** — never a key check, never a B&A-infrastructure call; that boundary is `export_record`'s alone. Roadmap frames it as *largely template generation from the guidance-with-override model* — the override is the audit artifact (see `prompts/handoff.md` and `WORKFLOW.md`'s "guidance with override" — a gate that proceeds despite a flagged gap **logs the override**; `override_log` is the tool that surfaces/manages that record locally). Nail the WHAT before code.
>
> Sequence: **`superpowers:brainstorming`** (intent/scope/shape — what it reads, what it emits, its schema — no design or code before this) → **`/design-doc`** (Gate 3, WHAT & WHY, to `planning/designs/`; run **`/decisions`** first if it surfaces any open call, and stub TBDs in `src/TDD.md`) → **`superpowers:writing-plans`** → **`superpowers:subagent-driven-development`** (or **`superpowers:executing-plans`**) under **`superpowers:test-driven-development`** → **`superpowers:requesting-code-review`** → **`superpowers:finishing-a-development-branch`** (PR, squash, verify content on trunk — Obs 20). **A new tool triggers rule 8 (`src/API.md` gains its tool section, same commit) AND rule 2 (re-measure the context-budget ledger — the new tool definition adds standing cost; the total must stay under ~4k tokens; `context_audit` alone is 252).** Regenerate `.claude/commands/` only if `prompts/` changes (it should not for a tool).
>
> **Do NOT reopen `context_audit`** — TBD-10/11/12(MIN_FILES)/14/16/18/19/20 are closed and verified on trunk. **Lower-priority, separate loops (not this one):** the three §4-gap `/decisions` items (design §9 — component-manifest / test-fixture / bare-`docs/**`), the trigger to raise the **provisional `orphans:1`**; the design §9 item 6 residual (D1 edge case B); the rest of TBD-12; and the owner-gated Phase-1 release blockers (TBD-2/4 notices). `doc_drift` (tool #3, TBD-9) comes after `override_log`.
