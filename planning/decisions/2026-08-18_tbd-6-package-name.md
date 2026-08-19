# TBD-6 — Package / repo name

**Date:** 2026-08-18
**Status:** Resolved
**TBD:** TBD-6 (package/repo name — blocked everything; nothing scaffolds unnamed)

## Resolution
- GitHub repository: `B-A-MCP` (created and pushed public).
- npm package name: `b-a-mcp` — the lowercase form npm requires (package names must be lowercase; no uppercase or spaces).

## Reasoning
The repo name matches the CLAUDE.md Product/Repo fields. npm rejects uppercase in package names, so the published package lowercases to `b-a-mcp` while the GitHub repo keeps its casing. No scope prefix in Phase 1; a scoped name (`@org/b-a-mcp`) later is a mechanical rename, not a new decision.
