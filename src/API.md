# API.md — MCP Surface Specification

> **Schema-of-record rule.** This document must be updated in the same commit as any change to the MCP surface — a prompt added or renamed, a tool added, or an input/output JSON schema changed. It is never acceptable for this document to describe a prompt or tool that no longer matches the code. This file lives in `src/`, beside the code it binds to — that placement is the reminder.

---

## What This Documents

`b-a-mcp` is a local stdio MCP server — no HTTP, no authentication, no permission tiers, and no database. It exposes two kinds of surface to an MCP client: **prompts**, which carry the five B&A build-loop gates, and **tools**, which run local repo-audit checks against the user's own working tree. Each prompt and tool listed here is documented with its invocation contract and, once implemented, its input/output JSON schema. There are no HTTP routes, no access tokens, no user records, and no persistence in the free tier — everything below runs in-process on the user's machine.

---

## Prompts (free, unauthenticated)

The five gate prompts are the product. `prompts/` is the **source of truth** — this table records their names and invocation contract only; prompt *bodies* are not duplicated here.

| Prompt name  | Source file            | Gate                     |
|--------------|-------------------------|---------------------------|
| `problem-fit`| `prompts/problem-fit.md`| Gate 0 — override check   |
| `intake`     | `prompts/intake.md`     | Gate 1 — feature intake   |
| `decisions`  | `prompts/decisions.md`  | Gate 2 — decision resolution |
| `design-doc` | `prompts/design-doc.md` | Gate 3 — design doc       |
| `handoff`    | `prompts/handoff.md`    | Session close — handoff   |

Naming: MCP prompt names are kebab-case, matching their source filename without the extension.

**Not yet served.** These prompts exist as markdown files in `prompts/` and as generated `.claude/commands/` entries (see rule 1 in `CLAUDE.md`), but are not yet registered on an MCP `prompts/list` / `prompts/get` surface. Serving them over MCP is a later feature; this table will gain an input-schema column when that lands.

---

## Tools (free, unauthenticated)

**None at bootstrap.** `tools/list` returns `[]`. No tool JSON schema exists yet — a schema is added to this file in the same commit as the tool that defines it (rule 8, `CLAUDE.md`).

The intended first three free tools:

| Tool name       | Status      | Design doc |
|------------------|-------------|------------|
| `context_audit`  | Forthcoming | `planning/designs/2026-08-18_context-audit-design.md` |
| `doc_drift`      | Forthcoming | none yet (scope pending TBD-9) |
| `override_log`   | Forthcoming | none yet |

Naming: MCP tool names are snake_case.

---

## Paid Tool

`export_record` — Phase 2. Client-only; not part of the published `b-a-mcp` package. See `planning/Integration_Spec.md` when that phase begins.

---

## Error Format

Every tool that can fail returns a structured error as content, not a thrown exception the client can't read:

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

---

## Invariants

These hold across the whole tool surface. Concrete per-tool invariants (e.g. `context_audit` never reads above the project root) land with each tool's own implementation and schema.

- All tools are **read-only** against the user's repo — no tool writes to, deletes from, or persists outside the user's working tree.
- The free/paid boundary sits at `export_record` only. No free prompt or free tool makes a network call or requires a key.
- Every tool failure returns the structured error envelope above, never an unhandled exception.
