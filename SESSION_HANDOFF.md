# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

> **This handoff lives on `main`.** The `context_audit` orphans calibration (Track B) is closed, and the tool now **publishes a calibrated score** with the README carrying a real self-run. No active feature branch, no active design doc. This handoff's own docs commit (SESSION_HANDOFF.md + the Roadmap update) lands on top via a small `docs/` PR. The next session starts fresh from `main` — the only remaining Phase-1 gesture is the owner-gated `npm publish`.

---

## Repo state — verified 2026-09-01

- **Branch:** `main`. Feature branches this session (`docs/tbd-25-26-orphans-gate-reframe`, `docs/handoff-2026-09-01-tbd10-closed`, `feat/context-audit-calibrated-readme-sample`) were all squash-merged and deleted.
- **`main` HEAD:** `a7d06c4` — `feat(context_audit): publish calibrated score; README true-sample (#75)`. This handoff's docs commit lands on top.
- **Working tree:** clean after the handoff commit.
- **Tests:** **205 / 205** pass, `tsc` clean — re-run this session on `main` (baseline was 204; +1 render true-branch test). Node v20+.
- **Ledger:** **1023 / ~4000** (rule 2) — unchanged; no schema field added this session (`calibrated` already existed; only its value + description changed).
- **Phase-1 free tier:** feature-complete and **release-ready**, now with a **calibrated, caveat-free** `context_audit` score and a real self-run in the README. The only remaining release gesture is the actual `npm publish` on a semver tag (owner-gated: npm login + go; runbook `ops/CONTEXT.md`). Split launch, free tier first (TBD-8).

---

## Active design doc

- **None active.** Both pieces of work this session were resolved-in-gate (Track B: decisions counted-final, no build) or bounded (the calibrated flip: brainstorming → TDD, no design doc). Last design (`planning/designs/2026-08-28_component-manifest-orphan-detector-design.md`, D5) remains **COMPLETE / SHIPPED**.

---

## Decisions + work this session

### Track B — `context_audit` orphans calibration → CLOSED
- **TBD-25** (test-harness fixtures) + **TBD-26** (bare-`docs/**`) → **Resolved, counted-final.** No tight source-free mechanism; the un-netted residual stays a bounded visible-FP. `planning/decisions/2026-09-01_tbd-25-26-counted-final-and-raise-gate-reframe.md`.
- **TBD-10** (headline weighting) → **Resolved / CLOSED.** The `orphans:1` provisional→final raise was **REJECTED on measured evidence**; `orphans:1` ratified **FINAL**. All four sub-score weights final. `planning/calibration/2026-09-01_orphans-raise-revalidation-and-reconciliation.md`. **`context_audit` calibration is frozen.**

### Score now published (calibrated flip) — bounded, TDD
- `context_audit` sets `stats.calibrated: true` and drops the "not a published figure" caveat (PR #75). **Behavior-neutral** — the flag only gates the caveat + stats flag; scoring is unchanged (`emitCoverageFindings` stays a separate flag, still off). `src/API.md` `calibrated` description updated same commit (rule 8); ledger untouched (rule 2). README "See it run" is now a real run on this repo (100/100).

### Still open (none blocks anything)
- **TBD-12** — `coverage` source-vs-test significance **basis**, `SOURCE_EXTS` (provisional), the still-off coverage-**finding** emission (`coverage.ts` `emitCoverageFindings`). Its threshold number (`MIN_FILES=5`) is ratified; the residual does **not** affect the published score.
- **TBD-15** (AGENTS.md v1.1 `root.method`), **TBD-21** (override_log ISO-date), **TBD-22/23/24** (doc_drift v1.1).
- **Known bounded visible-FP `orphans` gaps** (calibration record §6) — doc-site (single-repo), month-slug archive (a D4a widening), per-source inventory, nested `.claude/**`. **All counted (visible FP), none blocking**; precision-only future work via the ratchet, never a silent widening.

---

## Remaining work

- **Track A — Phase-1 `npm publish`** (owner-gated). The last Phase-1 gesture. Runbook `ops/CONTEXT.md`. Release is honest now — the README shows a calibrated sample, not a placeholder.
- **No open detector or calibration work** — `context_audit` is frozen and now publishes clean.
- **Deferred feature (non-blocking): serve the 5 gate prompts over MCP + build the `.claude/commands/` generator.** Both are "later loop" per the CLAUDE.md checklist and do NOT block the publish. Scoped 2026-09-01 — see the Track B next-session starter below.

---

## Context not in the docs

- **The `orphans` sub-score is layout-tinted by design-limit, and `orphans:1` bounds it — do NOT re-open `orphans:1` as "provisional."** The code's `genuine_abandoned_count` is **374 corpus-wide (~90% un-netted accepted-layout/convention/archival; ≤~45 true rot)**, not the "20 true rot" the hand-classification implied. Prior re-validations validated the *taxonomy* but never reconciled it against **what the detectors net** — that gap sat in the numerator. Now documented (calibration record) and a WORKFLOW rule (Obs 36).
- **`calibrated` is now `true` and the flip is behavior-neutral.** If a future change reopens calibration, set it back to `false` (the render caveat + wording are still driven by the flag). It does **not** control coverage-finding emission — that is `emitCoverageFindings` (off, TBD-12).
- **README self-sample reproduction:** the numbers are a live self-audit at the current tree; a reader running `context_audit` on the repo at a later commit will see drifted numbers (more dated docs → more orphan findings, still netted). The featured orphan line is the tool's actual first emitted orphan; the rest is honestly abbreviated with "…N more".
- **The measurement harnesses live in the session scratchpad** (`…/scratchpad/orphans-revalidation.mjs`, `orphans-buckets.mjs`, `reconciliation.mjs`, `docsite-anchor-verify.mjs`) and will be torn down. To re-run: build, import the **production** functions from `dist/`, reconstruct the genuine-abandoned set from the `orphan` findings, and **triple-tie** the count against `buildGraph.genuineAbandonedCount` and `runContextAudit().stats.genuine_abandoned_count` before trusting any number (Obs 19). Corpus pinned at `~/dev/ba-calibration/` (pins in the calibration record §0).
- **task-observer:** Obs 36 (code-vs-taxonomy reconciliation) and Obs 37 (measure-then-rule; a firing ratchet is the safeguard working) logged this session.

---

## Next-session starter

Two tracks, independent (either order). **Track A** (release) is owner-gated and ready. **Track B** (serve the gate prompts over MCP + the commands generator) is a scoped, non-blocking feature.

### Track A — Phase-1 `npm publish` (owner-gated, ready now)

```
Publish the Phase-1 free tier of b-a-mcp to npm (main @ a7d06c4 + handoff commit).

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, and ops/CONTEXT.md (the release runbook).

## Goal
Publish b-a-mcp to npm on a semver tag. This is owner-gated: it needs npm login + an
explicit go, and it is an outward, hard-to-reverse action — confirm before publishing.

## Preconditions to verify FIRST (do not publish until all hold)
- LICENSE + THIRD_PARTY_NOTICES.md are final (not stubs) and the notices match the pinned
  versions in package.json (WORKFLOW.md Release rules).
- `npm publish --dry-run` clean from a fresh checkout: clone at HEAD, `npm ci`, build, run
  the suite (expect 205/205), then `npm publish --dry-run` — confirm the files whitelist
  packs LICENSE / NOTICES / README and excludes the bundled skills + dist test artifacts.
- The README sample is the calibrated real run (shipped this session) — no "uncalibrated"
  caveat, no "illustrative" placeholder.

## How (name the skills; do not restate their bodies)
- This is a release, not a build. Follow ops/CONTEXT.md. If any precondition fails, stop and
  surface it; a failed precondition is an entry gate, not a warning to publish past.
- Do NOT publish without the owner's explicit go in the session.

## Hard rules
- Rule 3 (free/paid boundary): the published tier is keyless; export_record (paid) is NOT in
  this release (blocked on the site-repo checkout, Phase 2).
- Rule 4 (THIRD_PARTY_NOTICES.md) must match the pinned bundle exactly.
```

### Track B — serve the 5 gate prompts over MCP + `.claude/commands/` generator (scoped 2026-09-01, non-blocking)

The 3 tools ship; the 5 gates are source-only (`prompts/*.md`) and NOT served over MCP (`src/API.md` §Prompts: "Not yet served"), and the `.claude/commands/` generator is unbuilt (CLAUDE.md rule 1 / checklist). Neither blocks the npm publish. Full scoping was done 2026-09-01 (this starter carries it).

```
Serve the 5 gate prompts over MCP and build the .claude/commands/ generator (b-a-mcp).

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, src/API.md (§Prompts), src/server.ts, and the 5
  prompts/*.md bodies.

## Shared prerequisite
Normalize all 5 prompts/*.md to ONE frontmatter schema. Four use `---` frontmatter
(`description:`; intake also has `argument-hint:`); problem-fit.md uses a `#`-header with NO
frontmatter. Both deliverables parse these files — normalize first.

## A — serve prompts over MCP (mirror the tools pattern in src/server.ts; @modelcontextprotocol/sdk
already a dep; prompts/ already in the npm `files` whitelist, so the .md ship in the package)
- Add `prompts: {}` to server capabilities; add ListPrompts + GetPrompts handlers; a prompt-registry
  module (like contextAuditTool) that loads prompts/*.md, parses frontmatter, resolves the path
  relative to the module (import.meta.url -> ../../prompts), NEVER cwd. GetPrompt returns
  { messages:[{ role:"user", content:{ type:"text", text:<body-minus-frontmatter> } }] } with argument
  interpolation where a gate takes one.
- DECISIONS to resolve at /decisions FIRST (not settled): per-gate argument schemas (intake takes a
  "raw feature idea"; do the others?); runtime-read vs bundle-at-build load strategy; the
  "conversation above" context model (an MCP prompt returns a message the client injects into its
  existing session — confirm that UX); rule-2 ledger treatment of the prompts/list standing cost
  (rule 2 is tool-scoped today — extend it); rule 8 (add the promised input-schema column to
  src/API.md §Prompts, same commit).
- TESTS (TDD): prompts/list returns 5 correctly-named; prompts/get returns the right body per name;
  intake argument interpolation; unknown name -> structured error; one e2e over stdio (mirror the
  existing "server lists three tools" / "server calls X over stdio" tests).

## B — .claude/commands/ generator
- A SEPARATE scripts/gen-commands.ts (NOT wired into tsc): glob prompts/*.md, parse frontmatter+body,
  emit .claude/commands/<name>.md in Claude Code slash-command format ($ARGUMENTS where a gate takes
  args). Run at /handoff per rule 1. Keep .claude/commands out of the npm files whitelist (already is).
- Consider making it a drift CHECK too (fail if prompts/ and generated commands/ diverge) — the real
  point of the rule-1 guardrail.

## How (name the skills; do not restate their bodies)
- superpowers:brainstorming to frame -> problem-fit (trivially yes) -> intake (read the 5 prompt
  bodies for what each assumes as input/context) -> decisions (the open items above) -> design-doc ->
  superpowers:writing-plans (plan-document-reviewer) -> superpowers:subagent-driven-development under
  superpowers:test-driven-development -> the reviewers -> superpowers:finishing-a-development-branch.

## Hard rules
- Rule 1 (prompts/ is source of truth; .claude/commands/ generated, never hand-edited; regenerate at
  /handoff). Rule 2 (measure + ledger the prompts/list standing cost). Rule 8 (src/API.md §Prompts
  same commit). Rule 3 (all keyless — the prompts are free).
```
