# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

> **Design-only session.** The gate chain (problem-fit → intake → decisions → design-doc) ran for **Track B** — serve the five gate prompts over MCP + the `.claude/commands/` generator — and produced **one approved design doc**. No code was written, no schema changed. This session's docs (the design doc, a Roadmap pointer note, and this handoff) land on `main` via a small `docs/` PR. The **build** is the next Track-B session; **Track A (`npm publish`) remains the only other open Phase-1 gesture** and does not depend on Track B.

---

## Repo state — verified 2026-09-01

- **Branch this session:** `docs/track-b-design-mcp-prompts-commands`, cut from `main` at `2b77172`.
- **`main` HEAD (base):** `2b77172` — `docs(handoff): add Track B starter — serve gate prompts over MCP + commands generator (#77)`.
- **This session's docs commit** (design doc + Roadmap note + this handoff) rides up on the `docs/` branch → PR → squash-merge. Verify content on `main` after merge (WORKFLOW squash-merge rule), not branch ancestry.
- **Working tree:** clean after the docs commit.
- **Code/tests:** **untouched** this session — no `src/`, `test/`, `prompts/`, or schema change. Last known-green baseline stands (205/205 on `main` @ `a7d06c4`, carried into `2b77172`). No re-run needed — nothing executable changed.
- **Ledger / rule 2:** unchanged (no tool added or widened). The prompts-surface ledger note is a **planned** change for the build, not made this session.

---

## Active design doc

- **`planning/designs/2026-09-01_mcp-prompts-and-commands-generator-design.md` — APPROVED, not yet built.**
- Covers both deliverables under one shared prerequisite (frontmatter normalization): **A** — serve the five gates over MCP `prompts/list`/`prompts/get` (customer-facing distribution surface); **B** — the `.claude/commands/` generator (internal rule-1 drift guardrail; the generated commands do **not** ship — not in the npm `files` whitelist).
- Owner reviewed it (caught two must-fixes — spec-rev citation and the registry path-anchor hop count — plus four clarifications), all applied, then approved.

---

## Decisions + TBDs

- **15 decisions resolved in-gate** (Gate 2), captured **verbatim** in the design doc's Decisions section (S4, D7a, D1–D16, plus title/completion trivia). **None stubbed** → the Master TBD Tracker (`src/TDD.md`) is **unchanged** this session.
- **No new TBDs opened.** Pre-existing open TBDs are untouched and non-blocking: TBD-12 (coverage basis), TBD-15, TBD-21, TBD-22/23/24.
- **Ratchet honored:** the owner's design-review findings were verified against source/spec before applying; the wrong spec-rev citation was corrected to the rev the repo pins (2025-06-18), not silently accepted.

---

## Remaining work

- **Track B build (next session):** turn the approved design doc into a plan and build it. Docs that update **during the build** (not now): `src/API.md` §Prompts (input-schema column, drop "Not yet served" — rule 8, same commit), `src/CONTEXT.md` (rule-2 ledger note for the `prompts/list` surface), `CLAUDE.md` Phase-1 checklist (flip the generator item to built), `README.md` (document the served prompt surface), `prompts/*.md` (frontmatter normalization + problem-fit `description`/arg), and the Roadmap item 4 flip to BUILT.
- **Track A — Phase-1 `npm publish`** (owner-gated): still the last release gesture. Runbook `ops/CONTEXT.md`. Unaffected by Track B.

---

## Context not in the docs

- **Spec revision is pinned at `2025-06-18`** (SDK ≥1.13.0, installed 1.30.0) — the same rev `context_audit` and the bootstrap pin. Verify prompt-surface facts against **that** rev, not the newest MCP docs (a docs tool's default "latest" cited the wrong rev this session; the owner caught it — task-observer Obs 38). The two load-bearing facts hold in 2025-06-18: `prompts/get` returns server-built `{description, messages:[{role,content}]}`, and prompts are user-controlled (slash-command invoked), so they cost near-zero standing model context (why rule 2 stays tool-scoped).
- **Registry path anchor is three hops, not two.** `rootDir "."` compiles `src/prompts/index.ts` to `dist/src/prompts/index.js`, so the shipped `prompts/` dir is `../../../prompts` from there (`../../prompts` = the nonexistent `dist/prompts`). The design resolves it by **walking up from `import.meta.url` to the nearest ancestor containing `prompts/`** (never cwd); both dev-from-`dist` and installed runs execute from `dist/src/`.
- **The `$ARGUMENTS` token is handled oppositely by the two channels by design:** the MCP server **substitutes** it (no client-side templating in MCP); the generator **preserves it literally** (Claude Code substitutes at slash-command time). Both behaviors need a test.
- **Live symptom that motivated the work:** this session's tooling surfaced `intake`/`decisions`/`design-doc`/`handoff` but **not `problem-fit`** — it has no frontmatter, so the one un-normalized gate is already invisible. Normalization fixes a current gap, not just a future one.
- **task-observer:** Obs 38 logged (verify library/protocol facts against the version the repo pins, not the newest docs).

---

## Next-session starter

Two tracks, independent (either order). **Track B** now has an approved design and is ready to build. **Track A** (release) is owner-gated and ready.

### Track B — build the approved design (serve prompts over MCP + `.claude/commands/` generator)

```
Build the approved Track-B design for b-a-mcp: serve the five gate prompts over MCP and add the .claude/commands/ generator.

## Session start (per CLAUDE.md)
- caveman auto-on; invoke task-observer before any tool work.
- Read CLAUDE.md, SESSION_HANDOFF.md, and the approved design doc:
  planning/designs/2026-09-01_mcp-prompts-and-commands-generator-design.md
  (also src/API.md §Prompts, src/CONTEXT.md ledger, src/server.ts, and the 5 prompts/*.md bodies).

## Goal
Implement the design as approved. It is design-complete: 15 decisions resolved in-gate (in the doc's
Decisions section), none stubbed. Do NOT re-open a resolved decision; if the build surfaces a genuinely
missed decision, return to /decisions to log it (the ratchet), never resolve by assumption.

## How (name the skills; do not restate their bodies)
- superpowers:writing-plans to turn the design doc into a chunked plan; the plan-document-reviewer checks it.
- superpowers:subagent-driven-development under superpowers:test-driven-development to build it.
- The code reviewers (superpowers:requesting-code-review) before finishing; superpowers:finishing-a-development-branch to integrate.

## Same-commit / hard rules (from the design + CLAUDE.md)
- Rule 8: src/API.md §Prompts (input-schema column, drop "Not yet served") in the SAME commit as the serve code.
- Rule 2: add the prompts/list surface NOTE to the src/CONTEXT.md ledger; the tool ledger + <4000 assertion stay unchanged (prompts are user-controlled, not standing context — D7a).
- Rule 1: prompts/ is source of truth; regenerate .claude/commands/ at /handoff, never hand-edit; keep .claude/commands out of the npm files whitelist.
- Rule 3: everything keyless (the prompts + generator are free).
- Rule 4: NO new dependency — hand-rolled frontmatter parser (must strip only a LEADING ---…---, never body --- dividers, D16).
- Verify the "$ARGUMENTS split" with tests (server substitutes; generator preserves literal). Verify prompt-surface facts against MCP spec rev 2025-06-18, not the newest docs.
- D15 is a `normal mode` writing task: write problem-fit's description and review the other four as customer-facing menu copy (caveman off for that copy).
```

### Track A — Phase-1 `npm publish` (owner-gated, ready now)

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
- npm publish --dry-run clean from a fresh checkout: clone at HEAD, npm ci, build, run the suite
  (expect 205/205), then npm publish --dry-run — files whitelist packs LICENSE/NOTICES/README, excludes
  bundled skills + dist test artifacts. (Track B does NOT change the shipped package unless it has merged.)
- README sample is the calibrated real run — no "uncalibrated" caveat, no placeholder.

## How
- This is a release, not a build. Follow ops/CONTEXT.md. A failed precondition is an entry gate, not a
  warning to publish past. Do NOT publish without the owner's explicit go.

## Hard rules
- Rule 3: published tier is keyless; export_record (paid) is NOT in this release (Phase 2, site-repo).
- Rule 4: THIRD_PARTY_NOTICES.md matches the pinned bundle exactly.
```
