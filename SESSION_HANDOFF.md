# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `8d9143e` (`docs(workflow): review-derived checklists from the first task-observer backlog review`) at the moment this file was written. Merging this handoff advances `main` once more — a live HEAD ahead of `8d9143e` is expected; a HEAD behind it is wrong.
- **Merge verification is now a standing rule** — `WORKFLOW.md` → "Review-derived checklists" → "Merge verification (Obs 16, corrected by Obs 20)". After a **squash** merge, verify **content on trunk** (grep changed symbols + new files, re-run tests on `main`); `git merge-base --is-ancestor <branch-sha> main` FAILS by design on a squash and is NOT a broken merge; never check `<post-merge-HEAD>` (passes trivially). Everything below was verified this way.
- **Tests:** **115 / 115 pass**, `tsc --noEmit` clean, on `main` at `8d9143e`. **Node v25.2.1.** No code has changed since the TBD-10/11/12 build (`7a5bb28`) — the design, plan, and review sessions were docs-only.
- **Open PRs: #48 only** — `plan(context_audit): TBD-18 orphans re-base implementation plan (reviewed)`. **Intentionally left open**; it is the next session's input. This handoff opens one further PR (docs).
- Working tree clean before this write. `src/API.md` parses (4/4 JSON blocks) and matches the code (last changed `7a5bb28`). No `src/ERD.md` (no database). Context-budget ledger unchanged at **252 / ~4000** (rule 2). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **TBD-18 — `orphans` genuine-abandoned re-base:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` — **approved + merged (#47)**, amended for the `stats.genuine_abandoned_count` surfacing decision.
- **Implementation plan (built + reviewed, NOT executed):** `docs/superpowers/plans/2026-08-26-orphans-genuine-abandoned-rebase.md` — on **PR #48**. Ran the plan-document-reviewer (verdict: sound; CRITICAL backtick-fixture + IMPORTANT API.md-schema + 2 MINOR all applied). **Execution has not started.**

---

## Decisions + TBDs

### The arc since the last handoff (all landed on `main` except the open plan)

1. **TBD-10/11/12 NUMBERS** — owner-ratified at `/decisions` and **built** (#45): `ROUTER_TOKEN=3000`, `CHAIN_TOKEN=6000` ratified (`CHAIN_DEPTH=4` kept, under-determined); `MIN_FILES=5` ratified; `TBD_10_WEIGHTS={routing_drift:1,coverage:3,bloat:1}` (`orphans` excluded, gated on TBD-18). **TBD-11 CLOSED.** Decisions: `planning/decisions/2026-08-26_tbd-11-tbd-12-cutoff-numbers-ratified.md`, `…_tbd-10-weights-partial-and-tbd-18-orphans-rebase.md`.
2. **TBD-18 direction** — re-base `orphans` onto genuine-abandoned rot (net out the TBD-14 accepted-layout classes). **Design (#47) + plan (#48) done this arc.**
3. **task-observer backlog review** — first-ever full review (#49). All **21** observations ACTIONED (2026-08-26); rules distilled into `WORKFLOW.md` "Review-derived checklists"; `last-review-date.txt` set; backlog now **0 OPEN**. Obs 21 newly logged (the three "literal text to a shell-adjacent tool" process faults).

### Open TBDs
- **TBD-18** (this arc's build target) — design + plan ready, not executed. See Next-session starter.
- **TBD-10** — `orphans` weight only, still gated behind TBD-18 landing + re-validating.
- **TBD-12** — the source-vs-test significance **basis** (its own loop) remains open; `MIN_FILES` resolved.
- **TBD-2 / TBD-4 / TBD-5 / TBD-9 / TBD-15** — packaging / notices / pricing / doc_drift scope / v1.1 root.method. Open, untouched.

---

## Remaining work

- **Execute the TBD-18 plan (#48)** — the next actionable unit. 8 TDD tasks: `accepted-layout.ts` (D1–D4 + `isAcceptedLayout`) → `graph.ts` `genuineAbandonedCount` → `index.ts`/`types.ts` sub-score + `stats.genuine_abandoned_count` → docs (API.md rule 8, ledger re-measure rule 2 — expect unchanged 252).
- **Then:** code review → **categorical re-validation** on the pinned nine-repo corpus (design §6, incl. the **D4b `plans/`/`CHANGELOG/` per-net individual check**, §6.2) → `/decisions` to set the `orphans` weight (TBD-10) → the README true-sample.
- **README true-sample** — still gated (behind the `orphans` weight, behind TBD-18).

---

## Context not in the docs

- **The calibration clones are intact at `~/dev/ba-calibration/`** at the pinned run-6 commits (verified clean in the numbers session). `runContextAudit({ path })` read-only per clone is the harness; the re-validation reuses them.
- **Three build-relevant rulings from the review (also in `WORKFLOW.md` checklists):**
  - **Obs 18** — TBD-18's Task 6 Test A (nested→accepted→`genuineAbandonedCount===0`) + Test B (genuine→`===1`) are mutation-resistant **as a pair** (`isAcceptedLayout≡false` reddens A; `≡true` reddens B). During RED, confirm each reddens under its opposite trivial mutation — that is the Obs-18 hand-trace; no separate mutation guard needed.
  - **Obs 19** — the `stats.genuine_abandoned_count` surfacing makes the sub-score reconstructable from output, so the re-validation reconciles from the tool's output (no reproduced-internals harness, no fidelity gap). Only if the re-val reproduces a scorer internal does the re-derive-and-assert gate bind.
  - **Obs 20** — merging #48 by squash → verify **content on trunk**, not branch-SHA ancestry (now a standing WORKFLOW.md rule).
- **The genuine-orphan shape is subtle** (plan Task 6 Test B): the only non-accepted orphan is a doc **directly inside a directory routed by an UNREACHED non-root doc** (spec §D1 edge case). Every doc *nested below* a routed dir is D1-accepted; every doc *directly in* a dir routed by a *reached* source is itself reached. The reviewer confirmed Test B's fixture yields `genuineAbandonedCount===1`.
- **task-observer:** invoked at start of the review session; backlog is now **0 OPEN**. No new observations owed. The manual-trigger review cadence is the right one here (local-only log; a cloud scheduler can't reach it — weekly-review "regime 2").

---

## Next-session starter

> **Execute the TBD-18 plan (#48) via subagents.** **First, invoke `task-observer` at session start** (CLAUDE.md requires it; the backlog is 0 OPEN, so nothing to surface — just note it). Then **merge PR #48** into `main` (squash; verify content on trunk per `WORKFLOW.md` — grep the plan doc is present, re-run `npm test`), so the plan is on trunk. Read `CLAUDE.md`, this file, `WORKFLOW.md` (the new "Review-derived checklists"), `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md`, and `docs/superpowers/plans/2026-08-26-orphans-genuine-abandoned-rebase.md`. Confirm `git rev-parse HEAD` and `npm test` (expect **115**) before trusting anything; read constants from source.
>
> Build with **`superpowers:subagent-driven-development`** — a fresh subagent per task, review between tasks — under **`superpowers:test-driven-development`** (the plan's steps are already RED→GREEN→commit). Apply the three build-relevant rulings above (Obs 18 mutation-pair check during RED; Obs 19; Obs 20 on every merge). Keep the standing tie-breaker (visible FP > silent FN): the re-base must never silently swallow genuine rot. Do **not** set the `orphans` weight and do **not** change findings enumeration (both out of scope this build). No threshold/weight NUMBER beyond the plan (rule 7). Branch + PR, never direct to `main`.
>
> After all 8 tasks pass: **`superpowers:requesting-code-review`**, then the **categorical re-validation** on the pinned corpus at `~/dev/ba-calibration/` (design §6 — every netted orphan is a true accepted-layout doc; the **D4b `plans/`/`CHANGELOG/` nets checked individually**, §6.2; the 20 genuine-abandoned survive) as a `planning/calibration/` doc. Land via **`superpowers:finishing-a-development-branch`**. Only the re-validation closes TBD-18 and unblocks the `orphans` weight — a separate `/decisions` (TBD-10). Update `src/TDD.md` (TBD-18 → built / close pending or closed) and `planning/Roadmap.md`.
