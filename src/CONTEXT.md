# src/CONTEXT.md — Routing File for `src/`

Read this before writing any server or tool code in this workspace. It holds the `src/` conventions and the context-budget ledger required by `CLAUDE.md` rule 2. `src/API.md` (the MCP-surface schema-of-record) is a separate document — read it per its own "when to read" entry in the root `CLAUDE.md` document index. The Master TBD Tracker lives in the private **B-A-MCP-internal** repo. This file does not duplicate their content.

---

## Conventions

- **TypeScript, ESM, `NodeNext` resolution.** `tsconfig.json` sets `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`. Relative imports use explicit `.js` extensions (the compiled output's extension, not `.ts`), matching Node's native ESM resolution.
- **`index.ts` owns transport and process wiring.** It constructs the `StdioServerTransport`, calls `createServer()`, and connects the two. It does not construct the `Server` itself or register handlers.
- **`server.ts` owns server construction and handler registration.** `createServer()` builds the MCP `Server` instance, declares its capabilities, and registers all request handlers (`ListToolsRequestSchema`, and any future handlers). Transport-agnostic — it never touches stdio or `process`.
- **Tools live in `src/tools/`, one file per tool.** Filename is kebab-case (e.g. `context-audit.ts`); the MCP tool name it registers is snake_case (e.g. `context_audit`), per the root `CLAUDE.md` naming table. Each tool file registers itself through `server.ts` — `server.ts` stays the single place that assembles the tool list, individual tool files do not talk to `index.ts` or the transport directly.
- **Tests live in `test/`, using `node:test` and `node:assert` only.** No third-party test framework or assertion library. Existing tests (`test/server.test.ts`, `test/packaging.test.ts`) import from `node:test` and `node:assert/strict` — follow that pattern.
- **Structured error envelope.** Every tool that can fail returns errors as content, not a thrown exception the client can't read, in the exact shape from the root `CLAUDE.md`:

  ```json
  {
    "error": {
      "code": "SNAKE_CASE_ERROR_CODE",
      "message": "Human-readable description of the problem",
      "detail": "optional — path, field, or hint"
    }
  }
  ```

  Never reveal internal file paths outside the user's own working tree, or any B&A infrastructure detail, in an error surfaced to the client.

---

## Context-Budget Ledger

**Rule (CLAUDE.md rule 2), stated verbatim:** Standing tool-definition context cost stays under ~4k tokens. Every tool definition is measured and logged in the context-budget ledger in `src/CONTEXT.md`. Adding or widening a tool requires re-measuring and updating the ledger in the same commit. This is verified at `/handoff`.

| Tool | Standing tokens (measured) | Notes |
|------|------------------------------|-------|
| context_audit | 252 / ~4000 | char-approx-v1 over JSON.stringify(tool definition); re-measured after `score` became `["number","null"]` (sub-score confidence signal, 2026-08-20); 2026-08-21: re-verified after AGENTS.md router recognition — no description/schema change, cost unchanged. 2026-08-26: re-measured after surfacing stats.genuine_abandoned_count (TBD-18) — unchanged at 252, because outputSchema.properties.stats is the opaque {type:"object"} and the new field adds no standing tokens. 2026-08-26 (TBD-19/20): re-measured after the D1 dirTargets re-base and the D4b version-shape change — unchanged at 252; both are internal to buildGraph/accepted-layout with no change to the tool definition (index.ts). 2026-08-26 (TBD-10): re-measured after weighting orphans at 1 (TBD_10_WEIGHTS + ROUTING_LAYER_KEYS in score.ts) — unchanged at 252; the weights map and guard keys are internal to headlineScore, no change to the tool definition (index.ts). |
| override_log | 381 / ~4000 | char-approx-v1 over `JSON.stringify(overrideLogTool)`; measured 2026-08-27 at tool creation (`feat/override-log`). Generator/validator tool — `inputSchema` declares the seven override-event fields (all optional strings) and `outputSchema` keeps `findings`/`stats` as bare `{ type: "object" }` to hold standing cost, the same technique as `context_audit`. |
| doc_drift | 390 / ~4000 | char-approx-v1 over `JSON.stringify(docDriftTool)`; measured 2026-08-27 at tool creation (`feat/doc-drift`, Task 5), via `npm run build` then `node --input-type=module -e` against `dist/`. Pure structural differ — `inputSchema` declares the `pairs` array of `{label?, declared, canonical}` and `outputSchema` keeps `findings`/`stats` as bare `{ type: "object" }` to hold standing cost, the same technique as `context_audit`/`override_log`. |

**Total: 1023 / ~4000**

**Measurement method:** `countTokens(JSON.stringify(<tool>))` using char-approx-v1 (`ceil(chars / 4)`) over each serialized tool definition (name + description + input/output schema) sent in `tools/list`. `context_audit` alone is reproduced by `test/context-audit/ledger.test.ts`; the **combined** total (rule 2's real invariant) is asserted under 4000 by `test/override-log/ledger.test.ts`, which now covers all three tools — `context_audit`, `override_log`, and `doc_drift`.

**Prompt surface note (rule 2 scope).** The five gate prompts are served on `prompts/list` / `prompts/get`. They are **user-controlled** (MCP spec rev 2025-06-18: invoked by user choice / slash commands), NOT part of the model's standing tool-definition context — so they sit **outside** the rule-2 budget above and add nothing to the `1023 / ~4000` total. `prompts/list` metadata (five `name` + `description` + `arguments` entries) is returned only on demand when a client asks, and `prompts/get` bodies are read lazily per call. The tool ledger table and its combined `<4000` assertion (`test/override-log/ledger.test.ts`) are therefore unchanged by prompt-serving. (This is decision D7a/D7b: rule 2 stays tool-scoped.)
