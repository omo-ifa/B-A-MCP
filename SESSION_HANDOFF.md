# SESSION_HANDOFF.md

**Purpose.** Verified continuity between sessions. This file is *confirmed truth* — what is actually done and what is next. When it conflicts with claude-mem recall, this file wins. Update it at every `/handoff`. Never assert anything here that wasn't checked.

---

## Current state — as of 2026-08-18 (pre-build)

The repo has been scaffolded and the planning layer is in place. **No build loop has run yet.** No server or tool code exists.

**Confirmed present and correct:**
- `CLAUDE.md` — Layer 0 identity + routing, adapted to the MCP server (no DB, no auth, no UI).
- `prompts/` — five gate prompts: `problem-fit.md`, `intake.md`, `decisions.md`, `design-doc.md`, `handoff.md`.
- `src/` — adapted layout: `API.md`, `CONTEXT.md` (with context-budget ledger), `TDD.md`, `tools/`, `client/`. No `ERD.md`.
- `planning/designs/2026-08-18_ba-mcp-server-design.md` — the approved design doc.
- `planning/` support docs: `CONTEXT.md`, `Roadmap.md`, `Integration_Spec.md`.
- Root: `WORKFLOW.md`, `LICENSE` (stub), `THIRD_PARTY_NOTICES.md` (stub).

**Confirmed cut** (were scaffolded from the template, removed per the adaptation table):
- `planning/RBAC_Specification.md` — no roles.
- `planning/Data_Dictionary.md` — moves to the site repo (email captured at key issuance).
- `planning/Requirements.md` — deferred; the design doc covers current scope.

**Not yet created** (the loop and build produce these):
- `.claude/commands/` — generated from `prompts/` at build time.
- Any code under `src/tools/` or `src/client/`.
- Final `LICENSE` and `THIRD_PARTY_NOTICES.md` content — blocked on TBD-1, TBD-2.

---

## Blocking before the first loop

These are prerequisites, in order:

1. **TBD-2 — verify licenses.** Read the actual `LICENSE` / `plugin.json` in each of the four bundled component repos (Superpowers, caveman, claude-mem, task-observer). Do not trust third-party listings. Record findings in `THIRD_PARTY_NOTICES.md`.
2. **TBD-1 — claude-mem NOTICE file.** While in that repo, confirm whether an Apache 2.0 `NOTICE` file exists; if so, reproduce its contents in the notices file.
3. **Fill `[DATE]` targets** in the `CLAUDE.md` phase checklist and `planning/Roadmap.md`.

Once 1–3 are done, `LICENSE` and `THIRD_PARTY_NOTICES.md` can be finalized and the first `/intake` can run.

---

## Next action

Resolve TBD-2 and TBD-1 (read the four component repos). Then start the loop at `/problem-fit` or `/intake` against the first feature in `planning/Roadmap.md` — the recommended first build is `context_audit` (the acquisition hook, most bounded of the three tools).

---

## Open overrides

None. (Any `/problem-fit` or `/decisions` override taken in a session is logged here at `/handoff`.)
