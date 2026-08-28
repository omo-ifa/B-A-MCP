# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

> **This handoff lives on `main`.** The D5 build loop is complete and merged; there is no active feature branch. The next session starts fresh from `main` — pick a track from the Next-session starter at the bottom.

---

## Repo state — verified 2026-08-28

- **Branch:** `main` (the D5 feature branch `feat/orphans-component-manifest` was squash-merged and deleted, local + remote).
- **`main` HEAD:** `182edcd` — `feat(context_audit): detector D5 component-manifest (registry-glob orphan netting) (#70)`. (This handoff's own docs commit lands on top via a small `docs/` PR — see the note at the end.)
- **Working tree:** clean.
- **Tests:** **204 / 204 pass** on `main` (`tsc` clean, Node v20+) — re-run on `main` post-merge this session so the new D5 tests execute on the trunk, not just the branch. Baseline was 193; +11 (1 walk incl. gitignore-parity + root-level, 6 accepted-layout, 2 graph integration, +2 coverage from the final-review fix wave).
- **Ledger:** **1023 / ~4000** (rule 2) — unchanged; D5 adds no `tools/list` schema field.
- **Phase-1 free tier:** feature-complete and **release-ready**. All three free tools shipped; notices finalized; `npm publish --dry-run` clean from a fresh checkout (verified a prior session). The only remaining release gesture is the actual `npm publish` on a semver tag (owner-gated: needs npm login + go; runbook in `ops/CONTEXT.md`). Launch is **split — free tier first** (TBD-8).

---

## Active design doc

- `planning/designs/2026-08-28_component-manifest-orphan-detector-design.md` — **COMPLETE / SHIPPED** (detector D5, merged in PR #70).
- Mechanism decision (Gate 2): `planning/decisions/2026-08-28_component-manifest-detector-mechanism.md` — rulings L1–L13.
- Plan (executed): `docs/superpowers/plans/2026-08-28-component-manifest-detector.md`.

**What shipped.** `context_audit`'s `orphans` sub-score now nets a `DESCRIPTION.md` as intentional registry layout (out of `genuine_abandoned_count`) iff its parent dir holds `config.json` + `description.md` AND ≥3 sibling dirs under the same grandparent each do — structural, no source read, no path prefix (preserves TBD-14 Ruling 2). `walk.ts` emits `WalkResult.configDirs`; `accepted-layout.ts` gains `computeManifestDirs` + `isComponentManifest` and a 4-field `AcceptedLayoutCtx`; D5 is the fifth arm of `isAcceptedLayout`; `graph.ts` wires it; `src/API.md` enumerates **five** accepted-layout classes (rule 8, same commit). `score.ts` untouched — **`orphans:1` NOT raised** (L9).

---

## Decisions + TBDs

### Resolved this session
- **None.** This session was pure execution of the already-approved D5 plan (Gates 0–3 were done in prior sessions). No TBD was resolved.

### Advanced this session
- **D5 (component-manifest) mechanized and shipped** — the **first of the three §4-gap items** that gate TBD-10's `orphans:1` provisional→final raise. Recorded in the `src/TDD.md` TBD-10 status cell (2026-08-28 update).

### Still open (none blocks Phase-1 release)
- **TBD-10** — `orphans:1` stays **PROVISIONAL**. Remaining gates: **TBD-25** + **TBD-26** (the other two §4-gap items) **AND** the categorical corpus re-validation on the pinned nine-repo corpus. `coverage:3` / `bloat:1` / `routing_drift:1` are final.
- **TBD-25** — `orphans` test-harness-fixture mechanization (§4-gap #2). Open; deferred pending a tight source-free mechanism (no path-prefix rule allowed — the Ruling-2 casualty is `MSW_USAGE_GUIDE.md`).
- **TBD-26** — `orphans` bare-`docs/**` disposition (§4-gap #3). Open.
- **TBD-12** (coverage significance numbers, data-blocked), **TBD-15** (AGENTS.md v1.1), **TBD-21** (override_log ISO-date), **TBD-22/23/24** (doc_drift v1.1).

---

## Remaining work

- **Owner decision to surface (from the final whole-branch review, M5):** `planning/designs/2026-08-28_component-manifest-orphan-detector-design.md`'s "Docs affected" line names `src/tools/context-audit/index.ts` as the wiring site, but the orphan computation lives in `graph.ts`, which is where the code correctly landed (the plan was authoritative). The shipped code is correct; only that one design-doc line is stale. **Not edited this session** — it's an approved Gate-3 doc; correcting it is the owner's call. One-line fix if desired.
- **The `orphans:1` finalization track is NOT a ready plan.** TBD-25 and TBD-26 have no approved mechanism yet (rule 7 — not guessed); they need `/decisions` passes first, then the corpus re-validation, then the raise. See the Next-session starter.

---

## Context not in the docs

- **The §4-gap is real un-mechanized code, not a paper gap.** TBD-14 classified component-manifest / test-fixture / bare-docs by hand in the re-validation; the *code* (`accepted-layout.ts`) never netted them. D5 is now the first of the three mechanized. `orphans` raw score still carries TBD-25/26's classes as rot until those land.
- **D1-isolation in the integration test (verified by hand-trace this session).** The registry fixture routes to a *file* under the registry parent, so that dir is a `routedDir` (file-parent) but NOT a `dirTarget` → detector D1 cannot fire → only D5 nets the `DESCRIPTION.md` files. The `notes.md` control proves the counter still catches real rot. Counts: `orphanCount 4 / genuineAbandoned 1` for a ≥3 registry with one rot doc; `2 / 2` for a 2-entry registry below threshold. Both fail loudly under a broken/absent D5 — genuine discriminators.
- **gitignore-parity is now the only D5 branch with a dedicated test.** `walk.ts` records `config.json` into `configDirs` only when not gitignored; the added `walk` test uses a *file-level* ignore (`ignored-dir/config.json`), not a whole-dir ignore (which is pruned upstream and would not exercise the branch).
- **Execution quality (this session):** subagent-driven-development under TDD, one fresh subagent per task + per-task review (all ✅ Approved, 0 Critical/Important) + whole-branch review on opus (Ready to merge: Yes). One final-review fix wave closed two coverage minors. Two plan-mandated minors parked (dup `docs.filter/map` in `graph.ts`; a dropped OR-test comment) — non-load-bearing, code stands.

---

## Next-session starter

Two tracks. Pick one; both are ready to describe to the owner.

### Track A — Phase-1 `npm publish` (owner-gated, ready now)
The free tier is release-ready. Publishing is owner-gated (npm login + go). Runbook: `ops/CONTEXT.md`. Split launch, free tier first (TBD-8). Nothing else in the repo blocks it.

### Track B — continue `context_audit` toward the `orphans:1` provisional→final raise
This is **gated work, not a ready plan** — do not fabricate a plan. The raise (TBD-10) needs all three §4-gap items mechanized + a corpus re-validation. D5 is done; two items remain, and both must go through the gates first.

```
Continue the context_audit orphans track for the B-A-MCP repo (main @ 182edcd).

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, and src/TDD.md (TBD-10, TBD-25, TBD-26).

## Goal
Move TBD-10's orphans:1 from PROVISIONAL to FINAL. Gates remaining:
  1. TBD-25 — a TIGHT, SOURCE-FREE test-harness-fixture detector (no path prefix; must
     NOT swallow MSW_USAGE_GUIDE.md, the Ruling-2 casualty). No mechanism exists yet.
  2. TBD-26 — bare-`docs/**` disposition (routed-by-convention vs orphaned).
  3. The categorical corpus re-validation on the PINNED nine-repo corpus, confirming the
     §4-gap downward-bias is bounded before the raise.

## How (name the skills; do not restate their bodies)
- TBD-25 and TBD-26 are decisions-gated. Run the `decisions` gate on each: resolve or
  re-defer, nothing built on a guess (rule 7). If a tight source-free mechanism is found,
  take it through `design-doc`, then `superpowers:writing-plans` (plan-document-reviewer),
  then `superpowers:subagent-driven-development` under `superpowers:test-driven-development`,
  then the reviewers and `superpowers:finishing-a-development-branch`.
- The corpus re-validation follows the planning/calibration/ pattern (pin the corpus,
  one variable per run, verify positives on ground truth) — see prior runs under
  planning/calibration/. It is a measurement task, not a build.

## Hard rules
- Rule 2 (ledger unchanged unless a schema field is genuinely added + re-measured).
- Rule 8 (API.md same-commit as any schema/description change).
- Do NOT raise orphans:1 until ALL THREE gates above are satisfied (owner ratifies the
  final number at an interactive gate — rule 7).
```
