# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field is checked from inside the repo, never asserted. When this conflicts with claude-mem recall, this file wins. Updated at every `/handoff`.

---

## Repo state

- **Branch:** `feat/server-bootstrap` (10 commits ahead of `main`).
- **Last commit:** `5e88192` — `docs: correct src/TDD.md changelog and drop cut ERD.md reference`.
- **Working tree:** clean.
- **PR:** [#1](https://github.com/omo-ifa/B-A-MCP/pull/1) — `feat/server-bootstrap` → `main`, open, awaiting review/merge. Per `WORKFLOW.md` no direct commits to `main`; the PR review is the gate. Not yet merged.
- **Build/tests (verified this session):** `npm run build` clean; `npm test` → **2 pass / 0 fail** (`test/server.test.ts`, `test/packaging.test.ts`), no leaked temp dirs.

---

## Active design docs

- **`planning/designs/2026-08-18_ba-mcp-server-design.md`** (Revision 2) — **approved**. The server shape this bootstrap implements.
- **`planning/designs/2026-08-18_context-audit-design.md`** — **draft, awaiting review**. The **next** feature (`context_audit`, free tool #1). Its §4 held the `server-bootstrap` exit criteria, now all met.
- **`planning/plans/2026-08-18-server-bootstrap.md`** — **executed and complete** (Tasks 1–8 + final whole-branch review). This handoff closes it.

---

## Decisions + TBDs

**Resolved (recorded; TBD-6 was resolved in the pre-session ratchet, its record landed this branch):**
- **TBD-6** — package/repo name → repo `B-A-MCP`, npm package `b-a-mcp`. Reasoning in `planning/decisions/2026-08-18_tbd-6-package-name.md`. Tracker row marked **Resolved**.

No new TBDs were resolved this session — the work was the build, not decision resolution.

**Open TBDs** (full status in `src/TDD.md` Master TBD Tracker):
- **TBD-1** — claude-mem Apache-2.0 `NOTICE` file existence. Blocks `THIRD_PARTY_NOTICES.md`.
- **TBD-2** — confirm each of the **five** bundled components' license from its own `LICENSE`/`plugin.json` (now includes `icm-architect`). Blocks all packaging + notices/Integration_Spec finalization.
- **TBD-3** — DO Functions free allowance (cost model only, not load-bearing).
- **TBD-4** — ICM expression reproduce-vs-paraphrase; **escalated** — resolve before the notices file ships or any copy claims the methodology as B&A-original.
- **TBD-5** — paid-tier price/structure. Blocks `export_record` checkout.
- **TBD-7** — pinned Superpowers major version.
- **TBD-8** — split vs single launch.
- **TBD-9** — `doc_drift` scope (frameworks/migration formats).
- **TBD-10 / 11 / 12** — `context_audit` calibration stubs (headline weighting; bloat thresholds; coverage significance + thresholds). **Data-blocked** — calibrate from the first dogfood run. TBD-12 carries a **build guard**: the `high`-severity "uncovered significant workspace" finding must be gated behind `TODO: TBD-12` so it never fires on uncalibrated defaults.

---

## Remaining work

- **Merge PR [#1](https://github.com/omo-ifa/B-A-MCP/pull/1)** to `main` after review.
- **Build `context_audit`** (its own plan) — the next feature. Design doc exists; it needs a `writing-plans` pass, then build.
- **Deferred minors from this branch** (final review triaged all as non-blocking):
  - `src/TDD.md` still carries broad full-stack template debt (Universal Implementation Patterns: JWT/bcrypt/soft-delete/roles/caching; Security Rules quick-ref; Performance Targets). **Out of scope for bootstrap; schedule cleanup before `context_audit` ships** — that tool audits for exactly this orphan/bloat/drift, so dogfooding it against this file would be self-incriminating.
  - `test/server.test.ts` has no try/finally around `client.close()` (brief-verbatim test); `test/packaging.test.ts` connect-failure child not explicitly killed. Failure-path-only hygiene.
  - `src/API.md` cosmetic table widths + one extra Invariants bullet; `src/CONTEXT.md` em-dash placeholder ledger row; `planning/Roadmap.md` run-on prerequisite line.
  - `package.json` `files` lists `README.md` which does not exist yet (npm pack omits missing entries; harmless until README lands).
- **Legal files** (`LICENSE`, `THIRD_PARTY_NOTICES.md`) remain **stubs**, release-blocking, blocked on TBD-1/TBD-2.
- **Not built (later features, per plan Out-of-scope):** `.claude/commands/` generation from `prompts/`; MCP-prompt registration of the five gates; README; `export_record` client (Phase 2).

---

## Context not in the docs

- **`ignore` dependency is deliberately NOT in this branch.** The `context_audit` design §5 names `ignore` as a runtime dep + a notices entry, but the bootstrap plan's Global Constraints re-scope it to the `context_audit` plan. Add `ignore` (MIT) — plus its `THIRD_PARTY_NOTICES.md` block and `Integration_Spec.md` §2 row in the same commit (rule 4) — **when `context_audit` lands**, not before.
- **The first `context_audit` dogfood run is a CALIBRATION run, not the README run.** TBD-10/11/12 are data-blocked; calibrate them from that first run against `B-A-MCP`, then re-run — the second output is the README sample.
- **Node ≥21 detail:** the test script uses `node --test "dist/test/**/*.test.js"` (a glob). Native glob support for `--test` is Node ≥21; this machine ran node v25. On a strict Node-20 floor, verify the glob resolves (the `engines.node` floor is `>=20`).
- **Residual grep note:** `src/TDD.md`'s "## Changes Made" changelog describes the migration in past tense and names historical ids (`TBD-001…008`, `TBD-001…004`), so a literal `grep TBD-00[1-8] src/TDD.md` matches that prose. The **tracker table** holds zero placeholder rows — accurate historical description, not a live placeholder.
- **`.claude/commands/` is generated** from `prompts/` at build (rule 1) and regenerated only at `/handoff` — the generator build step does not exist yet, so nothing was regenerated this session.
- **Blocking-before-first-loop is now stale** as originally written (it named "the four bundled component repos"): the count is **five** with `icm-architect`, and the server skeleton already exists, so the original "before the first loop" framing no longer applies — the prerequisites that remain are the TBD-1/TBD-2 license verification and the `[DATE]` fills, tracked above.

---

## Next-session starter

Paste-ready prompt for the next session:

> Build `context_audit` (Phase 1 free tool #1) for the B&A MCP server. The `server-bootstrap` prerequisite is complete and under review (PR #1) — an installable stdio server registering zero tools exists under `src/`.
>
> Read first: `CLAUDE.md` (rules 1–8, TBD policy), `SESSION_HANDOFF.md` (this file), and the design doc `planning/designs/2026-08-18_context-audit-design.md`.
>
> Then: use `superpowers:writing-plans` to turn the design doc into a chunked implementation plan; have the `plan-document-reviewer` check it. Execute with `superpowers:subagent-driven-development` (or `superpowers:executing-plans`) under `superpowers:test-driven-development`. Add the `ignore` (MIT) runtime dependency with its `THIRD_PARTY_NOTICES.md` block and `Integration_Spec.md` §2 row in the same commit (rule 4). Update `src/API.md` (the `context_audit` schema) and `src/CONTEXT.md` (the context-budget ledger row) in the same commit as the tool (rules 8, 2). Gate the `high`-severity "uncovered significant workspace" finding behind `TODO: TBD-12`. Run the code reviewers before finishing; then `superpowers:finishing-a-development-branch`.
>
> Remember: the first dogfood run is a **calibration** run for TBD-10/11/12, not the README run. Do the deferred `src/TDD.md` template-debt cleanup before shipping.

---

## Open overrides

None. (No `/problem-fit` or `/decisions` override was taken this session.)
