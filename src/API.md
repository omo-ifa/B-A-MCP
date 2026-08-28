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

`tools/list` returns three tools — `context_audit`, `override_log`, and `doc_drift`.

| Tool name       | Status      | Design doc |
|------------------|-------------|------------|
| `context_audit`  | **Shipped** | `planning/designs/2026-08-18_context-audit-design.md` |
| `override_log`   | **Shipped** | `planning/designs/2026-08-27_override-log-design.md` |
| `doc_drift`      | **Shipped** | `planning/designs/2026-08-27_doc-drift-design.md` |

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
    "score": { "type": ["number", "null"], "description": "weighted mean of the assessed, WEIGHTED sub-scores, 0-100. All four routing/hygiene sub-scores carry weight (`coverage:3`, `routing_drift:1`, `bloat:1`, `orphans:1`); `orphans` re-based onto genuine-abandoned rot only (`stats.genuine_abandoned_count`) when TBD-18 closed, and its weight (1, owner-ratified — TBD-10) is **provisional**, gated on §4-gap accepted-layout detection for any raise, not on signal quality. Null when every weighted sub-score is null (nothing assessable), and also when NO weighted routing-layer sub-score (routing_drift/coverage/orphans) was assessed — a routing-health composite is not formed from the hygiene sub-score (bloat) alone. A coverage floor of 0 is a routing measurement and keeps the headline. Never a fabricated composite." },
    "subscores": {
      "type": "object",
      "description": "FOUR sub-scores — bloat, orphans, routing_drift, coverage — each a { score, n } pair. (`broken_refs` was removed 2026-08-20: it duplicated routing_drift; broken links outside router docs are now `info` findings only, unscored.) `n` is the size of the population that sub-score actually assessed. `n === 0` means score is `null` (\"not assessed\") — an empty denominator is never reported as 100, and a null sub-score drops out of the headline's weighted mean instead of being treated as 0. (`orphans` carries weight 1 in the weighted mean — TBD-10, owner-ratified 2026-08-26 after TBD-18 closed; the weight is provisional, gated on §4-gap detection for a raise.) Routing edges are recognized (in ROUTER docs only) from BOTH `[text](path)` markdown links AND path-shaped backtick code-span paths (`` `src/CONTEXT.md` ``), resolved doc-relative OR root-relative. `routing_drift` counts, against all router links, both broken markdown links AND path-shaped router backticks that resolve to nothing (category `routing_path_missing`). Template placeholders (`chart:<chart_id>`, `<dir>`) are not paths in either link syntax OR in any document type, and are excluded from routing counts likewise — including from non-router `broken_ref`. Two further spans are not routing paths by shape and are excluded the same way: an ellipsis segment (`stages/01_.../CONTEXT.md` — a stand-in for an omitted name) and a bare filename carrying no path segment (`CONTEXT.md`, `SKILL.md` — a non-resolving one is prose, e.g. a file-type mention or a citation, not a route). A router path resolves doc-relative OR root-relative; a span in a NESTED router that resolves under neither base but which matches a walked document inside that router's own subtree is an \"unanchored reference\" — router prose routinely describes a sibling or child directory, so the path is real and the base is unknowable. An unanchored reference is neither drift nor an edge, and is excluded from this sub-score's numerator and denominator; a router at the repository ROOT has no proper subtree bound and is therefore strict anchored-or-drift. When a router's entire reference set is unanchored the denominator is empty and this sub-score reports `null` (`n === 0`), which is correct — there is no population to compute a rate over. `orphans` reports null when the routing layer resolves zero edges from any root (`resolvedRefsFromRoots === 0`) — with no routing basis, 'unreachable from a routing root' is vacuous. A document directly contained in a directory that is itself a resolved routing target is reachable (route-to-directory propagation, directory-only depth), so orphans reflects routing rot rather than the legitimate route-to-directory convention; a document in a SUBDIRECTORY of a routed directory is not covered by that propagation. The `orphans` sub-score itself is now re-based (TBD-18) to score **genuine-abandoned** orphans only: among unreachable candidates, five accepted-layout classes — route-to-directory-nested, skill-discovery, agent-runtime config, tight dated/versioned-archival, and component-manifest — are still enumerated as `orphan` findings (and counted in `stats.orphan_count`) but excluded from the scored numerator; the numerator is `stats.genuine_abandoned_count` (always ≤ `orphan_count`), the denominator (`n`) is unchanged (`orphanCandidateTotal`), so `orphans.score` is reconstructable directly from the `stats` block as `1 − genuine_abandoned_count / n`. `coverage` reports null in the same routing-basis sense but SCOPED to the `routing_unresolved` state (`routing_files > 0 && resolvedRefsFromRoots === 0`): routers present but resolving nothing → coverage is not measurable → null. It still floors to 0 (a real assessed result) when routing resolves ≥1 edge but covers no significant directory, and when there are no routers at all (`root_absent`, `routing_files === 0`) — the latter preserving the headline-definite-when-significant-dirs invariant.",
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
      "required": ["docs_in_scope", "routing_files", "routing_tokens", "orphan_count", "genuine_abandoned_count", "files_skipped", "token_count_method", "calibrated"],
      "properties": {
        "docs_in_scope": { "type": "number" },
        "routing_files": { "type": "number" },
        "routing_tokens": { "type": "number" },
        "orphan_count": { "type": "number" },
        "genuine_abandoned_count": { "type": "number", "description": "orphans scored as rot — unreachable candidates that are NOT a detected accepted-layout class (route-to-directory-nested, skill-discovery, agent-runtime config, tight dated/versioned-archival, component-manifest). The orphans sub-score is 1 − genuine_abandoned_count / (its n); orphan_count stays the count of every orphan finding, so genuine_abandoned_count ≤ orphan_count." },
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

### `override_log`

A free, keyless tool that turns guidance-with-override *events* into a canonical, rendered override log with a completeness score and a finding per missing required field. It reads no repository files, makes no network call, and persists nothing — generating and rendering the record is the free tier's *reasoning* act; persisting it is `export_record`'s (paid). See `planning/designs/2026-08-27_override-log-design.md`.

**Input schema:**

```json
{
  "type": "object",
  "required": ["overrides"],
  "properties": {
    "overrides": {
      "type": "array",
      "description": "Override events to record. Each field is optional; a missing required field is flagged, never rejected.",
      "items": {
        "type": "object",
        "properties": {
          "gate": { "type": "string", "description": "The gate/checkpoint the override was taken at." },
          "risk": { "type": "string", "description": "The specific gap/risk the gate flagged." },
          "alternative": { "type": "string", "description": "The cheaper/safer path the gate named." },
          "decision": { "type": "string", "description": "What was chosen instead." },
          "acknowledged_by": { "type": "string", "description": "Who authorized proceeding." },
          "date": { "type": "string", "description": "When (a date string; presence checked, format not - v1)." },
          "rationale": { "type": "string", "description": "Optional: why they proceeded." }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

All seven event fields are optional — the tool never hard-refuses a call for a missing field (guidance-with-override applied to the tool itself). Six are *required for a complete record* (`gate`, `risk`, `alternative`, `decision`, `acknowledged_by`, `date`); `rationale` is optional and never faulted. `overrides` (the array) is the only schema-required key. Empty/whitespace field values are treated as missing.

**Output schema** (returned as `structuredContent`, matching the declared `outputSchema`). As with `context_audit`, the declared `outputSchema` keeps `findings.items` and `stats` as bare `{ type: "object" }` to hold the standing tool-definition cost within the rule-2 budget; the detailed shape below documents the payload the tool returns:

```json
{
  "type": "object",
  "required": ["score", "findings", "stats", "rendered"],
  "properties": {
    "score": { "type": ["number", "null"], "description": "100 * fully_documented / overrides_total, rounded; null when the overrides array is empty (never 100 over an empty denominator). An entry is fully documented iff all six required fields are present." },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "category", "severity", "entry_index", "message", "evidence"],
        "properties": {
          "id": { "type": "string", "description": "stableId(\"override_field_missing\", <entry discriminator>, <field name>) — a stable sha256(...).slice(0,12) over the entry's identity discriminator and the missing field, never the moving evidence. stableId is formula-identical to context_audit's findingId (locked by a boundary test) but is not the same function — override_log does not import findingId." },
          "category": { "const": "override_field_missing", "description": "the only category; every finding is a missing required field." },
          "severity": { "enum": ["info", "low", "medium", "high", "critical"], "description": "keyed by the missing FIELD, not the category: high for risk/alternative/date/acknowledged_by, medium for gate/decision." },
          "entry_index": { "type": "number", "description": "0-based position of the entry in the input array." },
          "message": { "type": "string" },
          "evidence": { "type": "string", "description": "the missing field's name." }
        }
      }
    },
    "stats": {
      "type": "object",
      "required": ["overrides_total", "fully_documented", "incomplete", "fields_missing_total"],
      "properties": {
        "overrides_total": { "type": "number" },
        "fully_documented": { "type": "number" },
        "incomplete": { "type": "number" },
        "fields_missing_total": { "type": "number" }
      }
    },
    "rendered": { "type": "string", "description": "tool-built markdown override log; the agent displays it verbatim." }
  },
  "additionalProperties": false
}
```

**Result shape.** Both halves ride in one `CallToolResult`: the full JSON object above as `structuredContent`, and `rendered` also as a `text` content block (`content[0].text === structuredContent.rendered`). The `rendered` log has a summary header (counts + completeness %), one block per entry (its id, the verbatim field values, missing-field flags), and a canonical one-line override sentence that includes the cheaper `alternative`.

**Entry id.** Each entry carries a stable id = `sha256(gate\0date\0decision).slice(0,12)` — a discriminator over the *identity* fields, never the moving field values, so it survives `risk` / `alternative` / `acknowledged_by` being completed. It is a reference/dedup key and the key `export_record` supersedes a prior version against — **not** a tamper-evidence guarantee: the id travels with the record and anyone holding it can recompute it. Unfakeability is the paid tier's property; this free tool does not assert it. The formula is identical to `context_audit`'s `findingId` (locked by a boundary test) so ids are comparable across tools. Ids are stable, **not unique within a call**: two entries sharing `gate`/`date`/`decision` (including two all-empty entries) produce identical entry and finding ids, distinguished in the output only by `entry_index`. A downstream deduper (`export_record`) must key on `entry_index` too, never the id alone.

**Error surface.** A non-array (or absent) `overrides` returns the standard structured error envelope as a `text` block with `isError: true` and no `structuredContent`:

```json
{ "error": { "code": "INVALID_OVERRIDES", "message": "...", "detail": "field: overrides" } }
```

Absence of *fields* is never an error — it is scored and flagged as findings (guidance-with-override, not a hard refusal).

**Invariants:**

- **Read-only and file-free** — reads no repository files, writes nothing, persists nothing; structured input to structured output.
- **Keyless, no network** — the free/paid boundary (CLAUDE.md rule 3) sits at `export_record`; `override_log` never checks a key or calls B&A infrastructure.
- **Stateless / deterministic** — same input in, same output out; entries render in input order, findings in entry-then-required-field order.
- **Tool owns rendering** — `rendered` is built by the tool; the agent displays it verbatim.
- **Severity by field, not category** — keyed by the missing field; `context_audit`'s category-keyed `SEVERITY_BY_CATEGORY` pattern does not apply here (all findings share one category).
- **Stable id, not tamper-evidence** — see Entry id above.
- **v1 `date` validation is presence-only** — a malformed date renders verbatim; ISO-format validation + canonical rendering is deferred (TBD-21).

### `doc_drift`

A free, keyless tool that diagnoses schema-of-record drift: it takes an array of caller-supplied `{declared, canonical}` JSON-Schema pairs and returns a structural diagnosis of where they disagree — a completeness score, one finding per drifted field, and a rendered report. It is a **pure structural differ** — it reads no repository files, makes no network call, executes nothing, and persists nothing. Obtaining the canonical truth (a `tools/list` payload, an `openapi.json`, a GraphQL introspection result, etc.) is the calling agent's job; `doc_drift` only diffs the pair it is handed. Generating and rendering the record is the free tier's *reasoning* act; persisting it is `export_record`'s (paid). See `planning/designs/2026-08-27_doc-drift-design.md`.

**Input schema:**

```json
{
  "type": "object",
  "required": ["pairs"],
  "properties": {
    "pairs": {
      "type": "array",
      "description": "Schema pairs to compare. Each has an optional label and two JSON-Schema-shaped objects: declared (the doc's claim) and canonical (the ground truth the caller obtained).",
      "items": {
        "type": "object",
        "properties": {
          "label": { "type": "string", "description": "Identifies this pair in findings and the report." },
          "declared": { "type": "object", "description": "The schema as documented (e.g. a JSON block from API.md)." },
          "canonical": { "type": "object", "description": "The ground-truth schema the caller obtained (e.g. a tools/list payload)." }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

`pairs` (the array) is the only schema-required key. Within a pair, `label`, `declared`, and `canonical` are all optional at the schema level — an absent `declared`/`canonical` coerces to `{}` (a vacuous schema with no properties, so it contributes no fields to compare) rather than being rejected. An absent `label` gets a synthetic one (`pair N`) so unlabeled pairs don't collide in the rendered report. What is *not* tolerated is a **present-but-wrong-shaped** value — see the `INVALID_PAIRS` error surface below.

**Output schema** (returned as `structuredContent`, matching the declared `outputSchema`). As with `context_audit` and `override_log`, the declared `outputSchema` keeps `findings.items` and `stats` as bare `{ type: "object" }` to hold the standing tool-definition cost within the rule-2 budget; the detailed shape below documents the payload the tool actually returns:

```json
{
  "type": "object",
  "required": ["score", "findings", "stats", "rendered"],
  "properties": {
    "score": { "type": ["number", "null"], "description": "100 * in_sync / fields_compared, rounded; null when fields_compared is 0 (no non-opaque field-path across any pair, including an empty `pairs` array) — never a fabricated 100 over an empty denominator. Opaque `{type:object}`-no-properties nodes are wildcards and their field-paths are excluded from BOTH in_sync and fields_compared entirely — they are neutral and never scored as in-sync." },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "category", "severity", "label", "path", "message", "evidence"],
        "properties": {
          "id": { "type": "string", "description": "stableId(category, label, path) — a stable sha256(...).slice(0,12) over the finding's identity discriminator, never the moving evidence (the declared/canonical type or required-state). stableId is formula-identical to context_audit's findingId and override_log's stableId (locked by a boundary test) but is not the same function — doc_drift does not import either." },
          "category": { "enum": ["field_only_in_doc", "field_only_in_canonical", "type_mismatch", "required_drift"], "description": "the drift kind IS the category. field_only_in_doc: declared has a field canonical lacks (the doc over-promises). field_only_in_canonical: canonical has a field the doc omits (the doc is merely stale). type_mismatch: both sides have the field but its leaf `type` (or object-vs-leaf shape) disagrees. required_drift: the field's `required`-membership disagrees between declared and canonical, in either direction." },
          "severity": { "enum": ["info", "low", "medium", "high", "critical"], "description": "keyed by drift KIND, not by direction of harm within a kind: field_only_in_doc high, field_only_in_canonical medium, type_mismatch high, required_drift high in BOTH directions (doc-required/code-optional misleads a consumer; doc-optional/code-required breaks one) — required-drift is not merely stale the way field_only_in_canonical is." },
          "label": { "type": "string", "description": "the pair's label (explicit or synthetic)." },
          "path": { "type": "string", "description": "dotted field path from the pair's schema root, e.g. \"findings\" or \"stats.total\"." },
          "message": { "type": "string" },
          "evidence": { "type": "string", "description": "the concrete divergence (e.g. \"declared: string; canonical: number\"), never used in the id." }
        }
      }
    },
    "stats": {
      "type": "object",
      "required": ["pairs_total", "fields_compared", "in_sync", "drifted", "by_kind"],
      "properties": {
        "pairs_total": { "type": "number" },
        "fields_compared": { "type": "number", "description": "non-opaque comparable field-paths across all pairs — the score's denominator." },
        "in_sync": { "type": "number" },
        "drifted": { "type": "number", "description": "drifted field-PATHS, not findings — a path with two drift kinds (e.g. a required_drift AND a type_mismatch on the same field) is counted once here." },
        "by_kind": { "type": "object", "description": "count per DriftKind (the four categories above). by_kind's total may EXCEED drifted: one field-path can carry two drift kinds at once (required_drift + type_mismatch is the one collision the differ can emit on a single path), so summing by_kind does not reconcile against drifted — the two are deliberately different denominators, not a bug." }
      }
    },
    "rendered": { "type": "string", "description": "tool-built markdown drift report; the agent displays it verbatim." }
  },
  "additionalProperties": false
}
```

**Result shape.** Both halves ride in one `CallToolResult`: the full JSON object above as `structuredContent`, and `rendered` also as a `text` content block (`content[0].text === structuredContent.rendered`). The `rendered` report has a summary header (pair count + in-sync fraction/percent + drift count), one block per pair (its label, its drift findings or a no-drift line), and the opaque-wildcard accepted-limitation note.

**Finding id.** Each finding carries `stableId(category, label, path)` — a discriminator over the finding's *identity* (the drift kind, the pair label, and the field path), never the moving evidence (the declared/canonical values that differ), so the id is stable across a value changing while the drift itself persists. It is a reference/dedup key, **not a tamper-evidence guarantee** — the id travels with the record and anyone holding it can recompute it; unfakeability is the paid tier's property. The formula is identical to `context_audit`'s `findingId` and `override_log`'s `stableId` (locked by a boundary test) so ids are comparable across all three tools. Ids are stable, **not unique within a call**: synthetic labels are index-derived (`pair 1`, `pair 2`, ...) so they never collide, but two pairs sharing the *same explicit* `label` that also drift the same field path produce identical finding ids, distinguished only by their position in `findings[]`. A downstream deduper (`export_record`) must not key on the id alone.

**Error surface.** A malformed call returns the standard structured error envelope as a `text` block with `isError: true` and no `structuredContent`:

```json
{ "error": { "code": "INVALID_PAIRS", "message": "...", "detail": "field: pairs | pairs[i] is not an object | pairs[i].declared is not an object | pairs[i].canonical is not an object" } }
```

`INVALID_PAIRS` fires for: a non-array (or absent) `pairs`; a pair member that is not a plain object (e.g. a string or array in the array); or a **present-but-non-object** `declared`/`canonical` (e.g. a JSON-encoded schema string, or an array) — accepting that silently would coerce it to `{}` and misreport a malformed call as a fully-opaque, no-drift pair. An **absent** `declared`/`canonical` is not the same shape of problem and stays valid (coerces to `{}`, scored as vacuous). An **empty** `pairs` array is likewise valid, not malformed — it resolves to `score: null` (nothing to compare), never `INVALID_PAIRS`.

**Invariants:**

- **Read-only and file-free** — reads no repository files, writes nothing, persists nothing; structured input to structured output. The canonical the caller supplies is trusted, not verified — like `override_log` trusting the events it's handed, `doc_drift` cannot tell a real canonical from a fabricated one.
- **Keyless, no network** — the free/paid boundary (CLAUDE.md rule 3) sits at `export_record`; `doc_drift` never checks a key or calls B&A infrastructure.
- **Stateless / deterministic** — same input in, same output out; pairs render in input order, findings in per-pair walk order.
- **Tool owns rendering** — `rendered` is built by the tool; the agent displays it verbatim.
- **Severity by drift kind** — see the `findings.severity` description above; `override_log`'s severity-by-*field* pattern does not apply here.
- **Opaque nodes are wildcards, by definition, not by exception.** A `{type:"object"}` node with no `properties` — including an explicitly empty `properties: {}`, since v1 reads no `additionalProperties` semantics — matches any counterpart: no drift is emitted at it or anywhere in the subtree it stands for, and its field-path is excluded from the score's denominator. **Accepted limitation:** drift *inside* an opaque node is invisible (as is a canonical that drops *all* its fields to `properties: {}`); the documented recourse is to feed a more complete canonical (e.g. a server's real `tools/list` output rather than a hand-trimmed stand-in).
- **Stable id, not tamper-evidence; colliding explicit labels collide.** See Finding id above — two pairs sharing an explicit `label` and a drifted field path yield identical finding ids, distinguished only by position in `findings[]`, the same latent edge `override_log` accepts on its entry ids.
- **v1 comparison surface is field presence + leaf `type` + `required`-membership.** Richer keyword comparisons (`enum`, array `items` shape, `format`, `additionalProperties` semantics, description drift) are deliberately out of scope for v1 (TBD-24 covers the broader framework-migration axis; richer keyword comparison is a later refinement, not a v1 obligation).

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
