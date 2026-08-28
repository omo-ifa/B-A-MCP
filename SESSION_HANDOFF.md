# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

> **This handoff lives on the active branch `feat/orphans-component-manifest`** (the D5 build loop, held pre-implementation). The next session works on that branch — check it out first, then follow the Next-session starter at the bottom.

---

## Repo state — verified 2026-08-28

- **`main` HEAD:** `27c2824`. This session landed three squash PRs on `main`:
  - **#67** — `THIRD_PARTY_NOTICES.md` finalized (TBD-2 + TBD-4 resolved): all five bundled-component blocks + both runtime deps filled verbatim from each component's own `LICENSE`/`NOTICE`/`README` at the pinned commit; STUB banner removed; icm-architect author corrected to Jake Van Clief. `Integration_Spec.md` §2 pins recorded; `ops/CONTEXT.md` publish runbook written.
  - **#68** — README corrected: all three free tools shipped (was "one shipping today, two forthcoming"); `broken_refs` dropped from the sub-score list; "See it run" sample marked illustrative.
  - **#69** — TBD-3/5/8 resolved, stale TBD-18 status-cell fixed, CLAUDE.md Phase-1 checklist reconciled.
- **Active branch:** `feat/orphans-component-manifest` HEAD `d75b48f` — **6 commits, docs/plan only, NO code** (held before implementation at the owner's instruction). This is the `context_audit` detector-D5 (component-manifest) build loop, taken through Gate 2 → Gate 3 → plan → plan-review → owner-approved plan.
- **Tests:** **193 / 193 pass** on both `main` and this branch (`tsc` clean, Node v20+). The branch adds no code yet, so the count is unchanged from `main`.
- **Ledger:** **1023 / ~4000** (rule 2) — unchanged; the D5 loop adds no `tools/list` schema field.
- **Phase-1 free tier:** feature-complete and **release-ready**. All three free tools shipped; notices finalized; `npm publish --dry-run` clean from a fresh checkout (verified this session: clone → `npm ci` 0 vulns → build → 193/193 → dry-run 34 files, LICENSE/NOTICES/README packed, bundled skills excluded). The only remaining release gesture is the actual `npm publish` on a semver tag (owner-gated: needs npm login + go; runbook in `ops/CONTEXT.md`). Launch is **split — free tier first** (TBD-8).

---

## Active work — `context_audit` detector D5 (component-manifest)

The full gated loop is complete through **plan-approval**; implementation is the next session.

- **Decision (Gate 2):** `planning/decisions/2026-08-28_component-manifest-detector-mechanism.md` — mechanism rulings L1–L13. D5 nets a `DESCRIPTION.md` iff its parent dir holds `config.json` + `description.md` AND **≥3** sibling dirs under the same grandparent each do (registry-glob shape; no path prefix — preserves TBD-14 Ruling 2). Threshold ≥3 owner-ratified; marker literally `config.json`; raise/widen only by explicit future ruling. Deferred: **TBD-25** (test-harness-fixture — no source-free tight mechanism today), **TBD-26** (bare-`docs/**`).
- **Design (Gate 3):** `planning/designs/2026-08-28_component-manifest-orphan-detector-design.md` — walk emits `configDirs` (walk is `.md`-only, so `config.json` presence must be walk-supplied); `computeManifestDirs()` mirrors `computeSkillDirs`; `AcceptedLayoutCtx` gains `manifestDirs`; API.md enumeration edit REQUIRED same-commit (rule 8).
- **Plan (approved):** `docs/superpowers/plans/2026-08-28-component-manifest-detector.md` — **3 tasks** (walk `configDirs`; D5 + wiring + API.md + unit tests; graph integration proof). Plan-reviewed: verdict Ready-after-fixes; the reviewer independently verified the D1-isolation claim and all integration counts. Fixes applied: **C1** (fan-out to `bloat.test.ts` WalkResult literal), **I2** (API.md folded into the code commit, rule 8), **M3** (config.json honors `.gitignore` like `.md`), **M4** (API.md edit-target disambiguation), plus owner test-only additions (top-level-registry test, deeper-than-qualifying-dir test, tsc-red-state clarification, graph.ts intent comment).
- **Scope boundary:** this loop mechanizes **detector D5 only**. It does **NOT** raise `orphans:1` (L9) and does **NOT** close TBD-10 — the provisional→final raise needs the categorical corpus re-validation on the pinned nine-repo corpus (a separate later session) AND all three §4-gap items (D5 + TBD-25 + TBD-26).

---

## Decisions + TBDs

### Resolved this session
- **TBD-2** (bundled licenses) + **TBD-4** (ICM reproduces icm-architect MIT files) → `planning/decisions/2026-08-27_tbd-2-4-resolved.md`.
- **TBD-5** ($9/mo subscription → `export_record` checks active entitlement) + **TBD-8** (split launch, free first) → `planning/decisions/2026-08-27_tbd-5-8-pricing-and-launch.md`.
- **TBD-3** (DO Functions allowance = 90,000 GiB-s, confirmed from DO's live pricing page; non-load-bearing) → `src/TDD.md`.
- **TBD-18** status-cell corrected (was already closed 2026-08-26).

### Opened this session
- **TBD-25** — `context_audit` orphans test-harness-fixture mechanization (§4-gap #2). Open.
- **TBD-26** — `context_audit` orphans bare-`docs/**` disposition (§4-gap #3). Open.

### Still open (none blocks Phase-1 release)
- **TBD-10** — `orphans:1` provisional→final raise, gated on the three §4-gap items (D5 building now; TBD-25/26 open) + corpus re-validation.
- **TBD-12** (coverage significance numbers, data-blocked), **TBD-15** (AGENTS.md v1.1), **TBD-21** (override_log ISO-date), **TBD-22/23/24** (doc_drift v1.1).

---

## Context not in the docs

- **The §4-gap is real un-mechanized code, not a paper gap.** TBD-14 classified component-manifest / test-fixture by hand in the re-validation; the *code* (`accepted-layout.ts`) never netted them. D5 is the first of the three to be mechanized. `orphans` raw score still carries the other two as rot until TBD-25/26 land.
- **D1-isolation in the integration test.** The plan's registry fixture links a *file* under the registry parent, so that dir is a `routedDir` (file-parent) but NOT a `dirTarget` → detector D1 cannot fire → only D5 can net the `DESCRIPTION.md` files. Verified by the plan reviewer (expected counts: `orphanCount 4 / genuineAbandoned 1` for a ≥3 registry with one real rot doc; `2 / 2` for a 2-entry registry below threshold).
- **Two fan-out sites for the two new required fields:** `WalkResult.configDirs` → `test/context-audit/bloat.test.ts:7`; `AcceptedLayoutCtx.manifestDirs` → `graph.ts:243` + `accepted-layout.test.ts:95`. tsc must be green at each task commit.
- **Owner workflow note (task-observer Obs 34):** a "what" ruling (taxonomy) that explicitly defers the "how" (mechanism) does NOT make a task bounded — the deferred mechanism is architectural/decisions-gated work. Read a cited decision's scope note before inheriting its authority.

---

## Next-session starter

> Paste the block below into a fresh Claude Code session to execute the approved D5 plan.

```
Execute the approved component-manifest detector (D5) plan for the B-A-MCP repo, via
subagent-driven-development under test-driven-development.

## Session start (per CLAUDE.md)
- caveman is auto-on; task-observer: invoke at session start before any tool work.
- Read CLAUDE.md and SESSION_HANDOFF.md. This is a Claude Code build session on an
  existing, approved plan — the brainstorming/decisions/design/plan gates are DONE.

## Starting state — verify before touching anything
- Branch: `feat/orphans-component-manifest` (check it out; do NOT branch again).
- `git rev-parse --short HEAD` must be `d75b48f`. Working tree clean.
- `npm test` must pass at the branch baseline (193 tests; the branch is docs/plan
  only — no code yet). `tsc` clean.
- If any of these differ, STOP and report — do not proceed on a surprised state.

## What to build
Plan (APPROVED — follow verbatim): docs/superpowers/plans/2026-08-28-component-manifest-detector.md
Design (WHAT/WHY): planning/designs/2026-08-28_component-manifest-orphan-detector-design.md
Mechanism decisions (L1–L13): planning/decisions/2026-08-28_component-manifest-detector-mechanism.md

It adds detector D5 to context_audit's orphans sub-score: a DESCRIPTION.md is netted as
intentional registry layout (not rot) iff its parent dir holds config.json + description.md
AND ≥3 sibling dirs under the same grandparent each do. Structural, no source read, no path
prefix. Three tasks: (1) walk.ts emits configDirs; (2) computeManifestDirs + isComponentManifest
+ D5 in accepted-layout.ts + graph.ts wiring + API.md enumeration (same commit) + unit tests;
(3) graph integration proof.

## Execution protocol (subagent-driven-development + TDD)
- One fresh subagent per task. Each task is strict TDD: write the failing test, verify it
  fails, implement minimally, verify pass, commit. Steps are spelled out in the plan.
- Task 2 Step 2: the tsc COMPILE failure is the red state. Do NOT run `node --test dist/...`
  after a failed build — a stale dist runs old tests green; that green is not a pass.
- After EACH task: run a per-task code review (fresh reviewer), then REPORT THE RESULT BACK
  to the user — files changed, test-count delta, per-task review verdict — before starting
  the next task. Do not batch silently.

## Hard rules (do not violate)
- Rule 2: the context-budget ledger stays unchanged. Do NOT edit src/CONTEXT.md; no
  tools/list schema field is added. The combined-total assertion in
  test/override-log/ledger.test.ts must stay green.
- Rule 8: the src/API.md enumeration edit ships in the SAME commit as the D5 code (Task 2,
  Steps 5–6) — not a separate commit. Keep the edited ```json blocks parse-valid.
- Do NOT touch src/tools/context-audit/score.ts. orphans:1, TBD_10_WEIGHTS, and
  ROUTING_LAYER_KEYS stay exactly as they are — this loop does NOT raise the weight (L9).
- Fan-out: adding required fields breaks literals. Task 1 fixes test/context-audit/bloat.test.ts:7
  (WalkResult). Task 2 fixes graph.ts:243 and accepted-layout.test.ts:95 (AcceptedLayoutCtx).
  tsc must be green at each task's commit.

## Scope boundary — what this loop does NOT do
- It mechanizes detector D5 only. It does NOT close TBD-10's provisional→final orphans:1 raise
  — that needs the categorical corpus re-validation on the pinned nine-repo corpus (a separate
  later session) AND all three §4-gap items. Do NOT touch TBD-25 (test-harness-fixture) or
  TBD-26 (bare-docs) — they stay stubbed/open. Do NOT run the corpus re-validation here.

## After all three tasks
1. superpowers:requesting-code-review — whole-branch review. Address findings
   (superpowers:receiving-code-review — verify, don't blindly accept).
2. superpowers:finishing-a-development-branch — open the PR, squash-merge to main, then
   VERIFY CONTENT ON TRUNK (Obs 20 / WORKFLOW.md): squash discards branch SHAs, so grep the
   new symbols (computeManifestDirs, isComponentManifest, configDirs, "component-manifest" in
   API.md) on main, confirm files present, and re-run `npm test` on main so the new tests
   execute there.
3. /handoff — update SESSION_HANDOFF.md: D5 shipped; orphans:1 still provisional; TBD-25/26
   remain the two §4-gap items gating the TBD-10 raise; the corpus re-validation is the next
   context_audit step.

## Expected end state
New tests added (~7 unit + 2 integration + 1 walk), full suite green above the 193 baseline,
tsc clean, API.md enumerates five accepted-layout classes, ledger still 1023/~4000 (unchanged).
```

> **Alternative, owner-gated track:** the Phase-1 `npm publish` (free tier, split launch) is ready whenever the owner runs it — see `ops/CONTEXT.md`.
