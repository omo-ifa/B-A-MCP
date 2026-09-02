# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

> **Build session.** Track B — serve the five gate prompts over MCP + the `.claude/commands/` generator — was **built** this session from its approved design, under the full ceremony (writing-plans → plan review → subagent-driven-development/TDD → whole-branch review → finishing-a-development-branch). The build lives in **open PR #82** on branch `feat/mcp-prompts-and-commands-generator`; it is **not yet merged to `main`**. Verify #82's live state directly (it was OPEN / MERGEABLE at this handoff). **Track A (`npm publish`) remains the only other open Phase-1 gesture** and does not depend on Track B.

---

## Repo state — verified 2026-09-02

- **`main` HEAD:** the tip of `main` is **this handoff commit itself** (this session's docs-only handoff commit); local up to date with `origin/main` at close. (Naming the tip by role, not a fixed SHA — merging the handoff advances the tip past any SHA written here; Obs 39.)
- **The Track B build is NOT on `main`.** It is in **PR #82** — branch `feat/mcp-prompts-and-commands-generator`, tip `67c4811`, base `6c7c319` (#81). 9 commits (frontmatter parser → problem-fit normalization → registry → serve-over-MCP → generator core → writer+un-ignore → drift test → docs → edge tests). Merging #82 is what puts the served prompt surface + generator on trunk.
- **Working tree:** clean (this docs branch off `main`).
- **Tests:** on the **PR #82 branch**, full suite **235/235** green (`npm test`, `tsc` clean; +30 over the 205 baseline). On **`main`** the last-known-green baseline stands (**205/205**) — the feature is unmerged, so main is unchanged and no re-run is needed there.
- **Ledger / rule 2:** the tool ledger table and its combined `<4000` assertion are **unchanged** by Track B (prompts are user-controlled, outside the standing budget — D7a/D7b). The prompts-surface **note** lives in `src/CONTEXT.md` on the #82 branch, not yet on `main`.

---

## Active design doc

- **`planning/designs/2026-09-01_mcp-prompts-and-commands-generator-design.md` — APPROVED and now BUILT (in PR #82), not yet merged.**
- Covered both deliverables under one shared prerequisite (frontmatter normalization): **A** — serve the five gates over MCP `prompts/list`/`prompts/get`; **B** — the `.claude/commands/` generator (internal rule-1 drift guardrail; the generated commands do **not** ship — not in the npm `files` whitelist).
- Owner-approved after two must-fixes + four clarifications (last session). This session an adversarial plan review (SHIP-WITH-FIXES, all applied) and a whole-branch code review (**SHIP-AS-IS**, verified live — reproduced the drift-guard failure, round-tripped orphan pruning, ran a real `npm pack` install) both passed.

---

## Decisions + TBDs

- **No TBD opened or resolved this session.** `src/TDD.md` (Master TBD Tracker) is **unchanged vs `main`**. The 16 design decisions were resolved in the prior Gate-2 session (verbatim in the design doc); this build resolved nothing new by assumption.
- **Pre-existing open TBDs untouched and non-blocking:** TBD-12 (coverage basis), TBD-15, TBD-21, TBD-22/23/24.
- **Rulings made during the build** (recorded in the SDD ledger + on PR #82, not TBDs): (1) inline execution over one-subagent-per-task — exact plan-reviewed code + coupled sequential edits, independent review preserved via the plan-review + whole-branch-review subagents; (2) batched the registry (resolver+list+get) into one commit; (3) added SDK result-type casts (`as ListPromptsResult`/`as GetPromptResult`) in `server.ts` — the plan's handler code did not compile without them (custom-typed return doesn't resolve to the SDK's `ServerResult` union member); runtime object was already correct, reviewer confirmed no shape mismatch. (4) whole-branch review ran on Sonnet (Opus session-limit hit mid-review).

---

## Remaining work

- **Merge PR #82** (owner review). On merge, `main` gains — in the feature's own commits — the served prompt surface, the generator, `src/API.md` §Prompts (Served, argument contract — rule 8), the `src/CONTEXT.md` prompt-surface ledger note (rule 2), the `CLAUDE.md` Phase-1 checklist flip, the `planning/Roadmap.md` item-4 → BUILT flip, the `README.md` prompt-surface section, and the committed `.claude/commands/` (with the `.gitignore` un-ignore). **Do not "fix" `main`'s `src/API.md` "Not yet served" line by hand — the fix is merging #82.**
- **Track A — Phase-1 `npm publish`** (owner-gated): still the last release gesture. Runbook `ops/CONTEXT.md`. Independent of Track B; Track B does not change the shipped package until #82 merges (then re-run the publish dry-run so the new `dist/src/prompts` packs).
- **task-observer:** Obs 40 (approved design assumed a repo state — `.claude/commands/` committed — that `.gitignore` blocked) and Obs 41 (plan review verified handler logic but not that the return type compiles against the framework's typed sink) are logged **OPEN**, non-blocking; next comprehensive review triages them.

---

## Context not in the docs

- **Schema-of-record is correct on the #82 branch, deliberately stale on `main` until merge.** `main`'s `src/API.md` still reads "Not yet served"; that is accurate for `main` (prompts aren't served on trunk yet) and is corrected inside #82. The `/handoff` schema check passes on this basis: API.md matches the code *on the branch that changes both*.
- **D9 resolver three-hop trap (load-bearing).** `resolvePromptsDir` walks up from `import.meta.url` requiring a `prompts/` dir **that contains `.md` files** — the `.md` guard is what skips the compiled `dist/src/prompts` (all `.js`) and lands on the real `prompts/` three hops up. A naive "nearest `prompts/`" walk-up would bind the wrong dir. Same anchor for test, dev-from-`dist`, and installed-package runs (the packaging test exercises the real installed layout).
- **`$ARGUMENTS` split, both directions tested:** the MCP server **substitutes** it (`body.split("$ARGUMENTS").join(idea)`, empty when absent); the generator **preserves it literally** (Claude Code substitutes at slash-command time).
- **`.claude/commands/` is now committed** (the `.gitignore` rule that ignored it was removed — Obs 40). Regenerate at `/handoff` with `node scripts/gen-commands.mjs`; never hand-edit; the drift guard `test/prompts/validation.test.ts` fails byte-for-byte if commands and prompts diverge.
- **Strategic note (this session's Q&A, not a doc change):** the bundled skills (caveman / claude-mem / task-observer / superpowers / icm-architect) are **not** wired into the server or the npm package — they are dev-session tooling plus a *documented future paid-tier skill bundle* (`THIRD_PARTY_NOTICES.md` "paid-tier skill bundle", pinned commits). Recommendation on record: build that bundle **separately**, delivered via a **gated download at checkout**, never by gating post-delivery files (task-observer is CC-BY-4.0 → rule 5) or bolting per-customer auth onto the keyless local server (rule 3). If pursued, run it through `/problem-fit` → `/intake` → `/decisions` (the "lead-gen vs. product" fork is the decision to force).
- **SDD ledger** at `.superpowers/sdd/2026-09-01-mcp-prompts-and-commands-generator/progress.md` (git-ignored) holds the full task-by-task log + every ruling. Delete that workspace once #82 merges.

---

## Next-session starter

Pick by PR #82's live state. **If #82 has merged**, Track A is the last Phase-1 gesture. **If #82 is still open**, land it (address any review comments, then merge).

### If #82 still open — land the Track B PR

```
Land PR #82 (feat/mcp-prompts-and-commands-generator) for b-a-mcp: serve five gates over MCP + .claude/commands generator.

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, and PR #82 (gh pr view 82; gh pr checks 82).

## Goal
Get #82 to a clean merge. If reviewers left comments, address them with superpowers:receiving-code-review
(verify each before implementing — do not perform agreement), fix on the branch under
superpowers:test-driven-development, re-run the whole suite (expect 235/235, tsc clean), and re-verify the
drift guard (`node scripts/gen-commands.mjs` leaves no diff). Then merge per WORKFLOW (squash) and confirm
CONTENT on trunk (grep the served surface + generator; re-run the suite on main) — not just the MERGED badge.

## Hard rules (unchanged from the build)
- Rule 8: src/API.md §Prompts stays in sync with the served surface in the same commit as any change.
- Rule 1: prompts/ is source of truth; regenerate .claude/commands via scripts/gen-commands.mjs, never hand-edit; keep .claude/commands out of the npm files whitelist.
- Rule 2/3/4 unchanged: <4000 tool assertion untouched; keyless; no new dependency (THIRD_PARTY_NOTICES.md unchanged).
- After merge: delete the SDD workspace .superpowers/sdd/2026-09-01-mcp-prompts-and-commands-generator/.
```

### If #82 merged — Track A: Phase-1 `npm publish` (owner-gated)

```
Publish the Phase-1 free tier of b-a-mcp to npm.

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, and ops/CONTEXT.md (the release runbook).

## Goal
Publish b-a-mcp to npm on a semver tag. Owner-gated: needs npm login + an explicit go; it is an outward,
hard-to-reverse action — confirm before publishing.

## Preconditions to verify FIRST (do not publish until all hold)
- LICENSE + THIRD_PARTY_NOTICES.md final (not stubs), matching the pinned versions in package.json.
- npm publish --dry-run clean from a FRESH checkout AFTER #82 merged: clone at HEAD, npm ci, build, run the
  suite (expect 235/235), then npm publish --dry-run — the files whitelist packs LICENSE/NOTICES/README +
  dist/src (now including dist/src/prompts) + prompts/*.md, and EXCLUDES .claude/commands + dist/test.
- README sample is the calibrated real run — no "uncalibrated" caveat, no placeholder.

## How
- This is a release, not a build. Follow ops/CONTEXT.md. A failed precondition is an entry gate, not a
  warning to publish past. Do NOT publish without the owner's explicit go.

## Hard rules
- Rule 3: published tier is keyless; export_record (paid) is NOT in this release (Phase 2, site-repo).
- Rule 4: THIRD_PARTY_NOTICES.md matches the pinned bundle exactly.
```
