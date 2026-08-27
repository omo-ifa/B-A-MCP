# CLAUDE.md

| Field           | Value                                                                 |
|-----------------|-----------------------------------------------------------------------|
| **Product**     | B&A MCP                                                                |
| **Repo**        | B-A-MCP                                                                |
| **One-liner**   | A free MCP server that ships the B&A build-loop gates and repo-audit tools; paid tier persists the documented record. |
| **Stack**       | TypeScript MCP server (stdio), published to npm · `export_record` client calls a DigitalOcean Function in the site repo |
| **Deployment**  | `npm publish` on a semver tag. Nothing deploys to a server — the free tier runs locally on the user's machine. |
| **Build model** | Solo (B&A) + Claude Code                                               |

---

## Session Behavior (three global skills — active every session)

- **caveman — auto-on.** Terse, filler-free output is the default; it only affects prose, never code, commands, or error text. Toggle OFF with `normal mode` for any writing task: branding copy, README prose, product-page copy, legal, or anything run through the brand-voice validation framework. Caveman auto-suspends for destructive-op and security confirmations — leave that intact.

- **task-observer — invoke at session start.** At the beginning of any task-oriented session (any session that uses tools and produces deliverables), invoke task-observer before beginning work. At session close, surface any observations logged.

- **claude-mem — passive recall.** Prior-session context is injected automatically at session start. Treat it as recall ("what happened"), not truth. `SESSION_HANDOFF.md` is verified truth ("what's confirmed and what's next"). When claude-mem and `SESSION_HANDOFF.md` conflict, `SESSION_HANDOFF.md` wins.

> `impeccable` is intentionally absent. This server ships no UI. If a web dashboard or hosted operator surface is added in a later phase, reintroduce it then.

---

## What This Project Is

B&A MCP is a Model Context Protocol server that puts the B&A four-stage build loop — Problem-Fit → Intake → Decisions → Design-Doc → Handoff — inside other developers' Claude Code sessions. The five gates ship as MCP **prompts** (near-zero standing context cost). Three repo-audit **tools** (`context_audit`, `doc_drift`, `override_log`) run locally and read the user's real files. Everything named so far is free and keyless.

The one paid tool, `export_record`, persists any gate or audit output as a versioned, timestamped artifact. It is the only call that touches B&A infrastructure and the only one that requires a key. The free tier is the reasoning; the paid tier is the record.

The server is a lead-generation and authority asset, not a revenue center. Developers are the distribution channel to the consulting buyer, not the buyer themselves.

---

## Workspace Layout

This project is organized into workspaces, each with a `CONTEXT.md` routing file. Read the `CONTEXT.md` for the area you are working in **before** loading any reference doc. This keeps context scoped: you load only what the current task needs.

| Workspace   | Holds                                                                        | Read first          |
|-------------|------------------------------------------------------------------------------|---------------------|
| `prompts/`  | The five shipped gate prompts — **source of truth for the product**          | (this file)         |
| `planning/` | Design docs, decision log, roadmap, the cross-repo integration contract      | `planning/CONTEXT.md` |
| `src/`      | Server + tool code **and** the MCP-surface doc that binds to it (`API.md`)   | `src/CONTEXT.md`    |
| `ops/`      | The release runbook (`npm publish` on a semver tag)                          | `ops/CONTEXT.md`    |

`.claude/commands/` is **generated** from `prompts/` at build time. Never edit it by hand — see rule 1.

There is no `docs/` workspace (no external-reader output yet), no database, and no `ops/` deploy pipeline beyond publishing.

---

## Document Index

Read the document listed **before** doing the work described.

### `prompts/` — the shipped product (source of truth)

| Document                 | When to Read It                                                        |
|--------------------------|-----------------------------------------------------------------------|
| `prompts/problem-fit.md` | Before touching Gate 0. The four-question override check.             |
| `prompts/intake.md`      | Before touching Gate 1. Grounded, one-at-a-time questioning.          |
| `prompts/decisions.md`   | Before touching Gate 2. Resolve-or-defer, nothing built on a guess.  |
| `prompts/design-doc.md`  | Before touching Gate 3. Fixed-shape design doc, WHAT & WHY only.     |
| `prompts/handoff.md`     | Before touching session close. Verify record matches reality; log overrides. |

### `src/` — schema-of-record (binds to code)

| Document       | When to Read It                                                                                      |
|----------------|------------------------------------------------------------------------------------------------------|
| `src/API.md`   | Before changing any prompt definition or tool schema. Source of truth for the MCP surface: prompt names, tool names, input/output JSON schemas. Update in the same commit as the code that changes it. |
| `src/CONTEXT.md` | Before writing server or tool code. Conventions, patterns, and the **context-budget** ledger (see rule 2). |
| `src/TDD.md`   | Before starting any tool. Holds the Master TBD Tracker.                                               |

### `planning/` — specs and decisions (read before building)

| Document                        | When to Read It                                                                     |
|---------------------------------|-------------------------------------------------------------------------------------|
| `planning/designs/`             | Before building any feature. The design doc states the WHAT and WHY.               |
| `planning/Integration_Spec.md`  | Before touching `export_record` or any bundled component. Holds the cross-repo `export_record` request/response contract and the pinned versions of every bundled third-party component. |
| `planning/Roadmap.md`           | Before starting a new phase. Phase definitions and dependency order.               |
| `planning/decisions/`           | When you need the *why* behind a resolved TBD.                                       |

### Root

| Document                  | When to Read It                                                                 |
|---------------------------|---------------------------------------------------------------------------------|
| `WORKFLOW.md`             | Before any commit or PR. The loop, branch strategy, commit conventions.        |
| `THIRD_PARTY_NOTICES.md`  | Before adding, removing, or version-bumping any bundled component. See rule 4. |
| `LICENSE`                 | Before changing license terms or the bundle composition.                        |

---

## How Work Reaches This Repo

High-level planning happens on Claude web/desktop and produces a **design doc** (the WHAT and WHY) plus resolved decisions, carried here via `SESSION_HANDOFF.md`. Claude Code does the build, using the Superpowers skills:

1. Read `SESSION_HANDOFF.md` and the design doc.
2. `superpowers:writing-plans` turns the design doc into a chunked implementation plan; the plan-document-reviewer checks it.
3. `superpowers:executing-plans` (or `subagent-driven-development`) builds it under `superpowers:test-driven-development`.
4. `src/API.md` updates in the same commit as any change to a prompt or tool schema.
5. The code reviewers run before finishing the branch.

Do not author implementation plans, tests, or task breakdowns from scratch in this repo — the Superpowers skills own that. Name the skill; let Claude Code read its body.

---

## Non-Negotiable Rules

These rules apply to every commit in this project. No exceptions.

1. **`prompts/` is the single source of truth for the gates.** `.claude/commands/` is generated from it at build time and must never be hand-edited. Regenerate at `/handoff`, not mid-task.
2. **Standing tool-definition context cost stays under ~4k tokens.** Every tool definition is measured and logged in the context-budget ledger in `src/CONTEXT.md`. Adding or widening a tool requires re-measuring and updating the ledger in the same commit. This is verified at `/handoff`.
3. **The free/paid boundary is fixed: free = reasoning, paid = record.** The five prompts and the three audit tools are keyless and never call B&A infrastructure. `export_record` is the only authenticated call. Do not add key checks to any other surface, and do not let a free tool persist an artifact.
4. **`THIRD_PARTY_NOTICES.md` updates in the same commit as any bundled-component change.** Bumping a pinned version, adding, or removing a component requires updating its notice block (name, author, license, license text, upstream URL, pinned version, modified/unmodified statement) in that same commit.
5. **No DRM on delivered files.** Gating the *download* behind payment is fine. Applying technological measures to files *after* delivery is not — it breaks the CC-BY-4.0 obligation on `task-observer`. The EULA carve-out (third-party components governed by their own licenses) must remain intact.
6. **`impeccable` is excluded and there is no UI.** Do not scaffold a frontend, a design kit, or a web surface in this repo without a design doc that reintroduces them as a new phase.
7. **TBDs are stubbed with `TODO: TBD-XXX`, never guessed.** See TBD Policy.
8. **`src/API.md` updates in the same commit as any prompt or tool-schema change.** The MCP surface is the public contract.

---

## TBD Policy

All TBDs are tracked in the Master TBD Tracker in `src/TDD.md`. When you encounter a TBD reference in any document:

1. Look it up in `src/TDD.md`.
2. If status is **open**: stub the implementation, leave a `TODO: TBD-XXX` comment, and continue.
3. **Never guess** at the resolution of a TBD.

When a TBD is **resolved**, record the reasoning in `planning/decisions/YYYY-MM-DD_title.md` (the tracker holds the status; the decision record holds the why).

### Key Open TBDs

| TBD ID  | Blocks                                                                            |
|---------|----------------------------------------------------------------------------------|
| TBD-5   | Paid-tier price and structure (one-time vs. subscription) — `export_record` checkout |

*(TBD-2 bundled-component licenses and TBD-4 ICM reproduce-vs-paraphrase both resolved 2026-08-27 — see `planning/decisions/2026-08-27_tbd-2-4-resolved.md`. Notices file finalized.)*

Full list and status live in `src/TDD.md`.

---

## Current Phase & Checklist

**Phase 1 — Free tier (local stdio server)** · Target: [DATE]

- [ ] Repo created (`B-A-MCP`), structure scaffolded per the design doc
- [x] `LICENSE` + `THIRD_PARTY_NOTICES.md` at root (2026-08-27 — TBD-1/TBD-7 resolved 2026-08-20; **TBD-2 + TBD-4 resolved 2026-08-27**, notices file finalized: all five bundled blocks + both runtime deps filled from source, STUB banner removed)
- [ ] Five prompts authored in `prompts/`
- [ ] Build step generates `.claude/commands/` from `prompts/`
- [ ] `context_audit` tool
- [x] `doc_drift` tool (2026-08-27, PR #65 — free/keyless provided/inline schema-drift differ; TBD-9 resolved; API.md §doc_drift Shipped; ledger 1023/~4000; orientation walk-test / framework parsing / canonical self-discovery deferred to TBD-22/23/24)
- [x] `override_log` tool (2026-08-27, PR #59 — free/keyless generator/validator; API.md §override_log; ledger 633/~4000; TBD-21 stubbed)
- [ ] Context-budget ledger populated and under ~4k tokens
- [ ] `src/API.md` covers every prompt and tool schema
- [ ] `npm publish` dry-run clean from a fresh checkout

**Phase 2 — Paid tier (`export_record`)** · Blocked on the site repo's consent-gated checkout

- [ ] `export_record` client in `src/client/`
- [ ] Cross-repo contract recorded in `planning/Integration_Spec.md`
- [ ] Key issuance + validation against Stripe customer metadata (site repo)
- [ ] EULA carve-out counsel-reviewed
- [ ] Sales-page disclosure naming each bundled component, above the buy button

---

## Naming Conventions

| Thing               | Convention          | Example                        |
|---------------------|---------------------|--------------------------------|
| Prompt files        | kebab-case          | `problem-fit.md`               |
| MCP prompt names    | kebab-case          | `problem-fit`                  |
| MCP tool names      | snake_case          | `context_audit`                |
| TypeScript files    | kebab-case          | `context-audit.ts`            |
| TypeScript types    | PascalCase          | `AuditResult`                  |
| TBD IDs             | `TBD-N`             | `TBD-9`                        |

---

## Error Response Format

MCP tools return structured errors as content, not thrown exceptions the client can't read. Every tool that can fail returns:

```json
{
  "error": {
    "code": "SNAKE_CASE_ERROR_CODE",
    "message": "Human-readable description of the problem",
    "detail": "optional — path, field, or hint"
  }
}
```

**Never reveal** internal file paths outside the user's own working tree, or any B&A infrastructure detail, in an error surfaced to the client.
