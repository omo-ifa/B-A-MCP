# src/CONTEXT.md — Routing File for `src/`

Read this before writing any server or tool code in this workspace. It holds the `src/` conventions and the context-budget ledger required by `CLAUDE.md` rule 2. `src/API.md` (the MCP-surface schema-of-record) and `src/TDD.md` (the Master TBD Tracker) are separate documents — read them per their own "when to read" entries in the root `CLAUDE.md` document index; this file does not duplicate their content.

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

At bootstrap there are zero tools registered (`tools/list` returns `[]`), so the table below carries no rows.

| Tool | Standing tokens (measured) | Notes |
|------|------------------------------|-------|
| — none — | — | No tools registered yet. |

**Total: 0 / ~4000**

**Measurement method:** not yet fixed. The method for measuring a tool definition's standing token cost is to be established when the first tool lands, so that the number recorded here is reproducible by anyone re-measuring it later. Whatever method is chosen (e.g. tokenizing the serialized tool schema sent in `tools/list`) must be recorded here alongside the first row it produces.
