# WORKFLOW.md

The loop and the rules for getting work into this repo. Read before any commit or PR.

---

## The loop

Five gates. Each does one job, hands a clean artifact to the next, and pauses for a human where judgment is cheapest to apply.

```
/problem-fit  → /intake     → /decisions      → /design-doc → /handoff
is AI right?    understand     resolve unknowns   write plan     close & record
(can STOP)      the problem    (resolve/defer)    (WHAT & WHY)   (verify + log)
```

- **Gate 0 · `/problem-fit`** — Runs before anything. Four questions; a low score overrides the whole engagement. Can legitimately end here.
- **Gate 1 · `/intake`** — Reads the current state first, then asks one question at a time until they dry up. Nothing written yet.
- **Gate 2 · `/decisions`** — Every open decision forced to *resolved* or *deferred* (tracked TBD with what it blocks). Nothing downstream built on a silent guess.
- **Gate 3 · `/design-doc`** — One design doc, fixed shape: motivation, approach, decisions carried over, what will change. WHAT and WHY, never the step-by-step how.
- **Gate 4 · `/handoff`** — Verify the record still matches reality, log the reasoning behind decisions and any overrides, write `SESSION_HANDOFF.md` for the next session.

**Gate mode: guidance with override.** No gate silently refuses to advance. On detecting a gap it states the specific risk, names the cheaper alternative, and — if the human proceeds anyway — logs the override rather than stopping. The override is the audit artifact.

---

## How a feature gets built

High-level planning happens on Claude web/desktop and produces a design doc + resolved decisions, carried here via `SESSION_HANDOFF.md`. Claude Code builds, using the Superpowers skills:

1. Read `SESSION_HANDOFF.md` and the design doc.
2. `superpowers:writing-plans` → chunked implementation plan; plan-document-reviewer checks it.
3. `superpowers:executing-plans` (or `subagent-driven-development`) builds under `superpowers:test-driven-development`.
4. `src/API.md` updates in the same commit as any prompt or tool-schema change.
5. Code reviewers run before finishing the branch.

Do not author plans, tests, or task breakdowns from scratch — the Superpowers skills own that. Name the skill; let Claude Code read its body.

---

## Branch & commit conventions

- **Branch per feature**, off `main`: `feat/context-audit`, `feat/doc-drift`, `fix/<slug>`.
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **Small commits** that keep the same-commit rules intact (below). A commit that changes a tool schema and the commit that updates `src/API.md` are the *same* commit.
- **No direct commits to `main`.** PR + review, even solo — the reviewer pass is the point.

---

## Same-commit rules (non-negotiable)

These bindings exist so docs can't drift from code:

1. **Prompt change → regenerate `.claude/commands/`.** `prompts/` is the source of truth. Regeneration happens at `/handoff`, not mid-task.
2. **Prompt or tool-schema change → `src/API.md`** in the same commit. The MCP surface is the public contract.
3. **Tool added or widened → context-budget ledger** in `src/CONTEXT.md`, re-measured, same commit. Standing cost stays under ~4k tokens.
4. **Bundled-component change → `THIRD_PARTY_NOTICES.md`** in the same commit (version pin, license block, modified/unmodified statement).

`/handoff` verifies all four before writing continuity.

---

## Release

- Free tier publishes to npm on a **semver tag**. Nothing deploys to a server.
- `ops/CONTEXT.md` holds the release runbook.
- A release is blocked unless `LICENSE` and `THIRD_PARTY_NOTICES.md` are final (not stubs) and the notices file matches the pinned versions in `package.json`.
- `export_record` (paid tier) is a separate release, blocked on the site repo's consent-gated checkout. See `planning/Integration_Spec.md`.
