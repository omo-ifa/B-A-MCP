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

`tools/list` currently returns one tool: `context_audit`. Two more are planned:

| Tool name       | Status      | Design doc |
|------------------|-------------|------------|
| `context_audit`  | **Shipped** | `planning/designs/2026-08-18_context-audit-design.md` |
| `doc_drift`      | Forthcoming | none yet (scope pending TBD-9) |
| `override_log`   | Forthcoming | none yet |

Naming: MCP tool names are snake_case.

### `context_audit`

A read-only tool that audits a repository's routing layer — the `CLAUDE.md` / `CONTEXT.md` tree — and returns a scored, unfakeable diagnosis of routing bloat, orphan docs, broken references, routing drift, and documentation coverage gaps. It reads the user's real files locally; it never writes and never inspects source-file contents. See `planning/designs/2026-08-18_context-audit-design.md` for the full rationale.

**Input schema:**

```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string", "description": "Directory to audit; defaults to the server working directory." }
  },
  "additionalProperties": false
}
```

`path` is optional; when omitted the audit runs against the server's working directory (`process.cwd()`).

**Root resolution.** The tool resolves upward from `path` to the nearest `CLAUDE.md` and treats that directory as root; if none is found, it falls back to the nearest git root (`.git/`); if neither exists, it uses the given path as-is. The returned `root.method` records which of the three applied (`claude_md` / `git_root` / `given_path`) — a `git_root` or `given_path` audit is a weaker claim than a `CLAUDE.md`-anchored one, and the record says so.

**Output schema** (returned as `structuredContent`, matching the tool's declared `outputSchema`). Note: the `outputSchema` actually declared in `index.ts` is intentionally minimal — `subscores`, `findings.items`, and `stats` are declared as bare `{ type: "object" }` there, to keep the standing tool-definition cost within the ~4000-token budget (CLAUDE.md rule 2); the detailed shape below documents the `structuredContent` payload the tool actually returns, not the declared schema itself:

```json
{
  "type": "object",
  "required": ["root", "score", "subscores", "findings", "stats", "rendered"],
  "properties": {
    "root": {
      "type": "object",
      "required": ["path", "method"],
      "properties": {
        "path": { "type": "string" },
        "method": { "enum": ["claude_md", "git_root", "given_path"] }
      }
    },
    "score": { "type": ["number", "null"], "description": "weighted mean of the assessed sub-scores, 0-100; null only when every sub-score is null (nothing in the repo was assessable) — never a fabricated composite" },
    "subscores": {
      "type": "object",
      "description": "bloat, orphans, broken_refs, routing_drift, coverage — each a { score, n } pair. `n` is the size of the population that sub-score actually assessed (e.g. classified edges checked, significant dirs judged, routing docs measured). `n === 0` means score is `null` (\"not assessed\") — an empty denominator is never reported as 100, and a null sub-score drops out of the headline's weighted mean instead of being treated as 0.",
      "properties": {
        "bloat": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } },
        "orphans": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } },
        "broken_refs": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } },
        "routing_drift": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } },
        "coverage": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } }
      }
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "category", "severity", "file", "line", "message", "evidence"],
        "properties": {
          "id": { "type": "string", "description": "stable hash of category + normalized path + discriminator; unchanged across runs while the finding persists" },
          "category": { "enum": ["orphan", "broken_ref", "routing_drift", "malformed_link", "escapes_root", "coverage", "bloat", "root_absent", "root_empty", "name_collision", "symlink", "skipped"] },
          "severity": { "enum": ["info", "low", "medium", "high", "critical"] },
          "file": { "type": "string", "description": "path relative to the resolved root; trailing '/' for the directory-level coverage finding" },
          "line": { "type": ["number", "null"] },
          "message": { "type": "string" },
          "evidence": { "type": "string", "description": "the raw counted/moving value — makes the finding unfakeable once persisted" }
        }
      }
    },
    "stats": {
      "type": "object",
      "required": ["docs_in_scope", "routing_files", "routing_tokens", "orphan_count", "files_skipped", "token_count_method", "calibrated"],
      "properties": {
        "docs_in_scope": { "type": "number" },
        "routing_files": { "type": "number" },
        "routing_tokens": { "type": "number" },
        "orphan_count": { "type": "number" },
        "files_skipped": { "type": "number" },
        "token_count_method": { "type": "string", "description": "e.g. char-approx-v1; a changed constant becomes a new method string" },
        "calibrated": { "type": "boolean", "description": "false while the bloat/coverage threshold TBDs (TBD-10/11/12) are stubbed" }
      }
    },
    "rendered": { "type": "string", "description": "tool-built markdown summary of the above; the agent displays it verbatim" }
  },
  "additionalProperties": false
}
```

**Result shape.** Both halves ride in one `CallToolResult`: the full JSON object above rides as `structuredContent`, and `rendered` also rides as a `text` content block (`content[0].text === structuredContent.rendered`) — the always-displayable surface a text-only client shows. The tool description instructs the agent to display the rendered text verbatim, never to summarize or reorder it.

**Error surface.** A failure to resolve a usable target returns the standard structured error envelope as a `text` block with `isError: true` and no `structuredContent`:

```json
{ "error": { "code": "NO_ROUTING_ROOT", "message": "...", "detail": "not_found | not_a_directory | not_readable" } }
```

`NO_ROUTING_ROOT` fires only for a genuine failure of the target path itself — it does not exist, is not a directory, or is not readable. Absence of `CLAUDE.md`/`CONTEXT.md` docs is never an error; it is scored as findings (`root_absent`, `root_empty`) instead.

**Invariants** (asserted per the design doc, same class of rule as the free/paid boundary):

- **Read-only** — never writes to, deletes from, or persists outside the user's working tree.
- **Never reads above the resolved root** — a relative path resolving above root, or any absolute filesystem path, is recorded as an `escapes_root` finding and never opened.
- **Never follows symlinks** — a symlink pointing at something in scope is recorded as a `symlink` finding, not traversed.
- **Stateless / no cache** — a cold walk every invocation; same tree in, same score out.
- **Tool owns rendering** — `rendered` is built by the tool from the structured result, never narrated by the agent.
- **Stable severity scale** — the five-level `severity` enum (`info`/`low`/`medium`/`high`/`critical`) is a fixed contract so historical `export_record` artifacts stay comparable, even as the underlying rubric evolves.
- **Normalized ordering** — findings are emitted in normalized (sorted) path order so two identical audits produce identical records.

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
