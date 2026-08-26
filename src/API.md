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

A read-only tool that audits a repository's routing layer — the `CLAUDE.md` / `AGENTS.md` / `CONTEXT.md` tree — and returns a scored, unfakeable diagnosis of routing bloat, orphan docs, broken references, routing drift, and documentation coverage gaps. It reads the user's real files locally; it never writes and never inspects source-file contents. See `planning/designs/2026-08-18_context-audit-design.md` for the full rationale.

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

**Root resolution.** The tool resolves upward from `path` to the nearest `CLAUDE.md` or `AGENTS.md` and treats that directory as root; if none is found, it falls back to the nearest git root (`.git/`); if neither exists, it uses the given path as-is. The returned `root.method` records which of the three applied (`claude_md` / `git_root` / `given_path`) — a `git_root` or `given_path` audit is a weaker claim than a `CLAUDE.md`-anchored one, and the record says so. An `AGENTS.md`-only repo (no `CLAUDE.md` entry) still reports `method: "claude_md"` — an accepted v1 label limitation; a distinct `agents_md` value is a v1.1 item. For the same reason, an empty `AGENTS.md`-only root is surfaced as `routing_unresolved` (info) rather than `root_empty` (critical); see TBD-15.

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
    "score": { "type": ["number", "null"], "description": "weighted mean of the assessed sub-scores, 0-100; null when every sub-score is null (nothing assessable), and also when NO routing-layer sub-score (routing_drift/coverage/orphans) was assessed — a routing-health composite is not formed from the hygiene sub-score (bloat) alone. A coverage floor of 0 is a routing measurement and keeps the headline. Never a fabricated composite." },
    "subscores": {
      "type": "object",
      "description": "FOUR sub-scores — bloat, orphans, routing_drift, coverage — each a { score, n } pair. (`broken_refs` was removed 2026-08-20: it duplicated routing_drift; broken links outside router docs are now `info` findings only, unscored.) `n` is the size of the population that sub-score actually assessed. `n === 0` means score is `null` (\"not assessed\") — an empty denominator is never reported as 100, and a null sub-score drops out of the headline's weighted mean instead of being treated as 0. Routing edges are recognized (in ROUTER docs only) from BOTH `[text](path)` markdown links AND path-shaped backtick code-span paths (`` `src/CONTEXT.md` ``), resolved doc-relative OR root-relative. `routing_drift` counts, against all router links, both broken markdown links AND path-shaped router backticks that resolve to nothing (category `routing_path_missing`). Template placeholders (`chart:<chart_id>`, `<dir>`) are not paths in either link syntax OR in any document type, and are excluded from routing counts likewise — including from non-router `broken_ref`. Two further spans are not routing paths by shape and are excluded the same way: an ellipsis segment (`stages/01_.../CONTEXT.md` — a stand-in for an omitted name) and a bare filename carrying no path segment (`CONTEXT.md`, `SKILL.md` — a non-resolving one is prose, e.g. a file-type mention or a citation, not a route). A router path resolves doc-relative OR root-relative; a span in a NESTED router that resolves under neither base but which matches a walked document inside that router's own subtree is an \"unanchored reference\" — router prose routinely describes a sibling or child directory, so the path is real and the base is unknowable. An unanchored reference is neither drift nor an edge, and is excluded from this sub-score's numerator and denominator; a router at the repository ROOT has no proper subtree bound and is therefore strict anchored-or-drift. When a router's entire reference set is unanchored the denominator is empty and this sub-score reports `null` (`n === 0`), which is correct — there is no population to compute a rate over. `orphans` reports null when the routing layer resolves zero edges from any root (`resolvedRefsFromRoots === 0`) — with no routing basis, 'unreachable from a routing root' is vacuous. A document directly contained in a directory that is itself a resolved routing target is reachable (route-to-directory propagation, directory-only depth), so orphans reflects routing rot rather than the legitimate route-to-directory convention; a document in a SUBDIRECTORY of a routed directory is not covered by that propagation. `coverage` reports null in the same routing-basis sense but SCOPED to the `routing_unresolved` state (`routing_files > 0 && resolvedRefsFromRoots === 0`): routers present but resolving nothing → coverage is not measurable → null. It still floors to 0 (a real assessed result) when routing resolves ≥1 edge but covers no significant directory, and when there are no routers at all (`root_absent`, `routing_files === 0`) — the latter preserving the headline-definite-when-significant-dirs invariant.",
      "properties": {
        "bloat": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } },
        "orphans": { "type": "object", "required": ["score", "n"], "properties": { "score": { "type": ["number", "null"] }, "n": { "type": "number" } } },
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
          "category": { "enum": ["orphan", "broken_ref", "routing_drift", "routing_path_missing", "malformed_link", "escapes_root", "coverage", "coverage_test", "bloat", "root_absent", "root_empty", "routing_unresolved", "name_collision", "symlink", "skipped"], "description": "routing_path_missing (high) is a path-shaped backtick in a ROUTER doc that resolves to nothing anywhere that router can be held responsible for — a broken route, counted toward routing_drift, tallied separately from broken markdown links. LIMITATION: in a NESTED router, a path matching a document elsewhere in that router's subtree is treated as unanchored rather than broken, so a genuinely rotted route is not reported when a same-named file survives under the same router — a deliberate trade against the far more frequent false accusation, recorded in planning/designs/2026-08-24_routing-drift-precision-design.md §3.5. broken_ref is now `info` (non-router broken links are reported, not scored). routing_unresolved (info) fires when routing files are present but none of their references resolve — a possible unrecognized routing syntax." },
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

`NO_ROUTING_ROOT` fires only for a genuine failure of the target path itself — it does not exist, is not a directory, or is not readable. Absence of `CLAUDE.md`/`AGENTS.md`/`CONTEXT.md` docs is never an error; it is scored as findings (`root_absent`, `root_empty`) instead.

**Invariants** (asserted per the design doc, same class of rule as the free/paid boundary):

- **Read-only** — never writes to, deletes from, or persists outside the user's working tree.
- **Never reads above the resolved root** — a relative path resolving above root, or any absolute filesystem path, is recorded as an `escapes_root` finding and never opened.
- **Never follows symlinks** — a symlink pointing at something in scope is recorded as a `symlink` finding, not traversed. The one exception is a symlink that merely **aliases a router already in scope** (e.g. `CLAUDE.md → AGENTS.md`, the convention app repos ship): it is deduped — no finding — and the router is scored once via its own real entry. The dedup applies only when the target's realpath is a structural router name, stays under root, and is itself in walk scope; otherwise the `symlink` finding is kept.
- **Stateless / no cache** — a cold walk every invocation; same tree in, same score out.
- **Tool owns rendering** — `rendered` is built by the tool from the structured result, never narrated by the agent.
- **Stable severity scale** — the five-level `severity` enum (`info`/`low`/`medium`/`high`/`critical`) is a fixed contract so historical `export_record` artifacts stay comparable, even as the underlying rubric evolves. An uncovered significant **source** directory is category `coverage` (severity `high`); an uncovered significant **test** directory — any path segment named `test`/`tests`/`__tests__`/`spec`, case-insensitive — is the distinct category `coverage_test` (severity `medium`). See `planning/decisions/2026-08-20_test-dir-coverage-severity.md`. Both remain gated behind the TBD-12 build guard and emit nothing on the default (no-opts) path.
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
