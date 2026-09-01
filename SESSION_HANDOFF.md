# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

> **This handoff lives on `main`.** Track B (the `context_audit` orphans calibration) is complete and merged; there is no active feature branch and no active design doc. This handoff's own docs commit (SESSION_HANDOFF.md + the Roadmap update) lands on top of the Track-B merge via a small `docs/` PR. The next session starts fresh from `main`.

---

## Repo state — verified 2026-09-01

- **Branch:** `main`. Track B branch `docs/tbd-25-26-orphans-gate-reframe` was squash-merged (PR #73) and deleted (local + remote).
- **`main` HEAD:** `96e6dc4` — `docs: close TBD-10 — orphans:1 FINAL (raise rejected on measured evidence); TBD-25/26 counted-final (#73)`. This handoff's docs commit lands on top.
- **Working tree:** clean after the handoff commit.
- **Tests:** **204 / 204** as last verified 2026-08-28. **No production code changed this session** (docs-only: decision + calibration records, tracker, WORKFLOW/CLAUDE/Roadmap prose), so the suite is unchanged and was **not** re-run this session. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` in `src/tools/context-audit/score.ts` untouched (verified in-diff and independent review).
- **Ledger:** **1023 / ~4000** (rule 2) — unchanged; no schema field added.
- **Phase-1 free tier:** feature-complete and **release-ready**. All three free tools shipped; notices finalized; a prior `npm publish --dry-run` was clean from a fresh checkout. The only remaining release gesture is the actual `npm publish` on a semver tag (owner-gated: npm login + go; runbook `ops/CONTEXT.md`). Split launch, free tier first (TBD-8).

---

## Active design doc

- **None active.** This session resolved decisions **counted-final** (no build), so no design doc was opened. The last design (`planning/designs/2026-08-28_component-manifest-orphan-detector-design.md`, detector D5) remains **COMPLETE / SHIPPED**.

---

## Decisions + TBDs

### Resolved this session
- **TBD-25** (test-harness fixtures) → **Resolved, counted-final.** No tight source-free mechanism (the fixture fact lives in source the tool won't read; every proxy swallows `MSW_USAGE_GUIDE.md`). The un-netted residual stays a bounded visible-FP. `planning/decisions/2026-09-01_tbd-25-26-counted-final-and-raise-gate-reframe.md` Ruling 1.
- **TBD-26** (bare-`docs/**`) → **Resolved, counted-final** (net nothing). A `docs/`/`plans/` segment net re-opens the TBD-20 silent-FN vector; an unrouted undated doc is arguably a true-positive orphan. Same record, Ruling 2. The doc-site reopen-lever was later **verified and failed** (§4 of the calibration record) → **not reopened**.
- **TBD-10** (`context_audit` headline weighting) → **Resolved / CLOSED.** The `orphans:1` provisional→final raise was **REJECTED on measured evidence**; `orphans:1` ratified **FINAL** (value unchanged). All four sub-score weights now final. `planning/calibration/2026-09-01_orphans-raise-revalidation-and-reconciliation.md`.

**`context_audit` calibration is COMPLETE — the tool is frozen.**

### Still open (none blocks anything)
- **TBD-12** — `coverage` source-vs-test significance **basis**, `SOURCE_EXTS` (provisional), the still-off coverage-finding emission. `MIN_FILES=5` already ratified.
- **TBD-15** (AGENTS.md v1.1 root.method label), **TBD-21** (override_log ISO-date), **TBD-22/23/24** (doc_drift v1.1).
- **Known bounded visible-FP `orphans` gaps** (calibration record §6) — doc-site (single-repo), month-slug archive (a D4a widening), per-source inventory (a registry shape), nested `.claude/**` (a bounded D3 fix). **All counted (visible FP), none blocking**; precision-only future work reachable via the ratchet (explicit `/decisions` + detector loop), never a silent widening. **Not opened as TBDs** — consistent with TBD-25/26 counted-final.

---

## Remaining work

- **README true-sample** — a true `runContextAudit` run for the README. **Now fully UNGATED** (all four sub-score weights final). This is the next `context_audit` deliverable if that track resumes. Note the layout-tint caveat (below) when choosing the sample repo.
- **Phase-1 `npm publish` (Track A)** — owner-gated, ready now.
- **No open detector work is required** — the orphans track is closed; the §6 gaps are optional precision improvements, not blockers.

---

## Context not in the docs

- **The headline finding: the `orphans` sub-score is layout-tinted by design-limit, and this was invisible until this session.** Prior re-validations validated the **taxonomy** ("every residual classifies into an accepted class") but never reconciled it against **what the detectors net**. The code's `genuine_abandoned_count` is **374 corpus-wide (~90% un-netted accepted-layout/convention/archival; ≤~45 true rot)**, not the "20 true rot" the hand-classification implied. `orphans:1` (the weight) **bounds** this tint's headline pull; that is exactly why the raise to 2 was rejected. Do **not** re-open `orphans:1` as "provisional" — it is FINAL.
- **The standing fix is now a rule:** WORKFLOW.md "Calibration & measurement" checklist (Obs 36) — a re-validation for a detector-netted score must reconcile **code-netting vs taxonomy** (per-detector netted == accepted), not merely classify residuals.
- **The measurement harnesses live in the session scratchpad** (`…/scratchpad/orphans-revalidation.mjs`, `orphans-buckets.mjs`, `reconciliation.mjs`, `docsite-anchor-verify.mjs`) and will be torn down. To re-run: build (`npm run build`), then import the **production** functions (`walk`, `buildGraph`, `computeSkillDirs`, `computeManifestDirs`, `isAcceptedLayout`) from `dist/`, reconstruct the genuine-abandoned set from the `orphan` findings, and **triple-tie** the count against `buildGraph.genuineAbandonedCount` and `runContextAudit().stats.genuine_abandoned_count` before trusting any number (Obs 19). Corpus pinned at `~/dev/ba-calibration/` (nine repos, pins in the calibration record §0).
- **`graph.ts` emits every orphan — accepted-layout and genuine — as an `orphan` finding** (`graph.ts:245`); `genuineAbandonedCount` is computed separately and is **not** flagged per-doc in the output. That is why the harness must re-run `isAcceptedLayout` to identify the genuine set.
- **task-observer:** Obs 36 (code-vs-taxonomy reconciliation) and Obs 37 (measure-then-rule; a firing ratchet is the safeguard working) logged this session.

---

## Next-session starter

Two tracks. Pick one; both are ready to describe to the owner.

### Track A — Phase-1 `npm publish` (owner-gated, ready now)
The free tier is release-ready. Publishing is owner-gated (npm login + go). Runbook: `ops/CONTEXT.md`. Split launch, free tier first (TBD-8). Nothing in the repo blocks it.

### Track B — README true-sample run (now unblocked)
`context_audit` calibration is frozen (all weights final), so a true `runContextAudit` sample for the README is unblocked.

```
Produce the README true-sample for context_audit in the B-A-MCP repo (main @ 96e6dc4 + handoff commit).

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, and planning/Roadmap.md (context_audit line).

## Goal
Add a real, reproducible `runContextAudit` sample to the README — a true run, never a
hand-written mock (rule: the score must be unfakeable). Pick a sample target that reads
honestly given the KNOWN layout-tint: the orphans sub-score counts un-netted accepted-layout
docs (bare-docs, doc-sites, archives) as genuine-abandoned — see
planning/calibration/2026-09-01_orphans-raise-revalidation-and-reconciliation.md before
choosing the repo, so the published number is not dominated by a Docusaurus tree.

## How (name the skills; do not restate their bodies)
- This is a docs deliverable over stable code, not a build. If it needs any code (e.g. a
  reproducible sample harness), route through superpowers:writing-plans (plan-document-reviewer)
  then superpowers:test-driven-development, then the reviewers and
  superpowers:finishing-a-development-branch. If it is pure docs, brainstorm the framing first.
- Any run MUST use the production entrypoint runContextAudit and be reproducible from a pinned
  target; triple-tie any derived number against the shipped output (Obs 19).

## Hard rules
- Rule 2 (ledger unchanged unless a schema field is genuinely added + re-measured).
- Rule 8 (src/API.md same-commit as any schema/description change).
- Do NOT re-open orphans:1 as provisional — it is FINAL (TBD-10 closed 2026-09-01). The
  layout-tint is a documented, weight-bounded limitation, not a bug to fix here.
```
