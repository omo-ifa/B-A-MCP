# Serve the gate prompts over MCP + `.claude/commands/` generator

**Summary.** Register the five gate prompts on the MCP `prompts/list` / `prompts/get` surface so any developer who installs `b-a-mcp` can invoke the build-loop gates, and add a build-time generator that renders `prompts/` into the repo's `.claude/commands/` slash-commands (the rule-1 guardrail). One shared prerequisite — a single frontmatter schema across all five prompts — precedes both.

---

## Motivation

The three audit tools ship and are model-callable, but the five gates — the *product* — are source-only. `src/API.md` §Prompts records them as "Not yet served," and `.claude/commands/` is empty (no generator). Two gaps follow:

- **Customer-facing (deliverable A).** `prompts/` is already in the npm `files` whitelist, so the markdown ships — but nothing registers it on the MCP prompt surface. An installer gets `context_audit`, `override_log`, `doc_drift`, and no gates. Serving the five gates as MCP prompts is what puts the build loop *inside another developer's Claude Code session* — the whole distribution thesis. Prompts are user-controlled (MCP spec rev 2025-06-18: invoked by user choice, e.g. slash commands), so they cost near-zero standing model context — the reason the gates were designed as prompts, not tools.
- **Internal (deliverable B).** CLAUDE.md rule 1 makes `prompts/` the single source of truth and `.claude/commands/` a generated artifact that "must never be hand-edited." There is no generator, so the guardrail is unenforced and `.claude/commands/` is empty. The generated commands do **not** ship (not in the npm whitelist); they serve this repo's own dogfooding and give rule 1 teeth via a drift check.

A live consequence already exists: this session's tooling surfaces `intake`/`decisions`/`design-doc`/`handoff` (they carry frontmatter `description:`) but **not** `problem-fit` (no frontmatter). The one un-normalized gate is already invisible. Doing the work now closes the last Phase-1 feature gap that is not the owner-gated `npm publish`; it does not block that publish.

---

## Architecture

Two deliverables over one shared prerequisite. A is customer-facing and higher-stakes; B is an internal guardrail and lighter.

### Shared prerequisite — one frontmatter schema

All five `prompts/*.md` normalize to a single schema: `description` (required) + optional `argument-hint`. Four already use YAML frontmatter; `problem-fit.md` has none (its metadata is body prose) and gains a `description:`. The `Stage`/`Job`/`Gate mode` lines in problem-fit stay as body prose — they belong to neither consumer's schema (MCP `Prompt` = `{name, description, arguments}`; Claude Code command frontmatter = `description`/`argument-hint`), so promoting them would be dead metadata.

A hand-rolled minimal frontmatter parser reads the schema — no YAML dependency added (keeps the bundle, and rule 4, untouched). Correctness constraint: the parser strips a frontmatter block **only when `---` opens the file**; `---` used as a markdown section divider inside a body (problem-fit and others do this) is never treated as a delimiter.

### Where it lives

- `src/prompts/` — the prompt-registry module (mirrors the `src/tools/<name>/` convention): loads `prompts/*.md`, parses frontmatter, exposes the list and get operations. Compiled by `tsc` (`include: ["src","test"]`), so it is unit-testable. It locates `prompts/` at runtime by walking up from `import.meta.url` to the nearest ancestor directory containing it (never cwd) — see D9.
- `scripts/gen-commands.mjs` — a thin writer that imports the compiled generator core from `dist/` and writes `.claude/commands/`. Plain ESM so it runs on Node ≥20 with no new dependency and stays outside the `tsc` build.
- The generator *core* (pure: prompt files → command-file contents) lives in `src/` beside the registry, so both the writer script and the drift test import the same tested code.
- `test/` — validation + drift test (Node's `node:test`, per convention).

### A — serve prompts over MCP

- **Capability.** `createServer()` gains `prompts: {}` alongside `tools: {}`, and registers `ListPrompts` and `GetPrompt` handlers next to the existing tool handlers. `server.ts` stays the single assembly point.
- **Servable set.** Every `prompts/*.md` (glob, dynamic) is a prompt — no hardcoded name list to drift against rule 1. The runtime is deliberately dynamic (rule 1) while the validation test pins the set to exactly the five expected names: intentional friction, so adding or removing a gate forces a deliberate test update rather than silently changing the served surface.
- **`prompts/list`.** Returns each prompt's `name` (filename without extension, kebab-case), `description` (from frontmatter), and `arguments`. Descriptions are read eagerly at construction (list needs them anyway). No `title` (v1).
- **`prompts/get`.** Returns `{ description, messages: [{ role: "user", content: { type: "text", text } }] }`, where `text` is the prompt body with the frontmatter stripped, and `$ARGUMENTS` substituted server-side. Bodies are read lazily at get time.
- **Arguments.** `intake` and `problem-fit` are the loop's entry points — a user invokes them arriving with an idea and no prior conversation to lean on — so each declares one optional argument, `idea`. (`problem-fit`'s (D1) additionally requires inserting a `$ARGUMENTS` interpolation point into its body — treated as a careful product edit.) The other three (`decisions`, `design-doc`, `handoff`) declare none: they run on context that already exists — the client's conversation ("the conversation above") or the live repo — which the returned message references and the server neither has nor passes. When an argument is absent, `$ARGUMENTS` interpolates to empty. No completion API.
- **Failure model.** Prompt faults never take down the three tools. A missing/unreadable `prompts/` directory makes `prompts/list` surface a clear error rather than a silent empty list; a single malformed file makes only that prompt's `get` error (`McpError(InvalidParams)`, no internal paths leaked); the rest serve. The primary enforcement is a CI validation test (below), so a malformed gate is caught before ship, not at a user's runtime. The two surfaces use intentionally different error models: the prompt surface raises `McpError(InvalidParams)` (a JSON-RPC protocol error), while the three tools return an in-band `{ error: { code, message } }` content block with `isError: true`; neither leaks an internal path.

### B — `.claude/commands/` generator

- **Output.** One `.claude/commands/<name>.md` per prompt, in Claude Code slash-command format: frontmatter carrying `description` (+ `argument-hint` where the prompt has one), body identical to the prompt body minus frontmatter, with `$ARGUMENTS` **preserved literally** (Claude Code substitutes it at slash-command time — the opposite of the MCP path, which substitutes server-side).
- **Orphans.** Generating prunes command files whose source prompt was deleted; the check flags them as drift.
- **Drift + validation test.** A single `test/` test both (a) validates every prompt parses, has a `description`, and the served set is exactly the five expected names, and (b) fails if regenerating `.claude/commands/` would differ from what is committed. This is where rule 1 gets teeth and where "fail loud" actually lives — at CI, before ship. Regeneration is deterministic — trailing newline / EOL normalized on both sides of the comparison — so the byte-for-byte check does not false-positive.
- **When it runs.** The writer script is run at `/handoff` (rule 1: regenerate at handoff, not mid-task). It is not wired into `tsc` or `npm run build`.

### Surface changes

- `src/server.ts` — `prompts: {}` capability + `ListPrompts`/`GetPrompt` handlers.
- New `src/prompts/` registry + generator core; new `scripts/gen-commands.mjs`; new `test/` validation/drift test.
- `prompts/*.md` — frontmatter normalization; `problem-fit.md` gains `description:` and (D1) an optional-argument interpolation point; the five `description` strings reviewed as customer-facing menu copy (D15).
- `src/API.md` §Prompts — gains the promised input-schema column and drops "Not yet served" (rule 8, same commit as the code).
- `src/CONTEXT.md` — a ledger **note** recording the `prompts/list` surface cost and why prompts sit outside the rule-2 standing budget (they are user-controlled/on-demand, not model-standing). The tool ledger and its `<4000` assertion are unchanged.
- `.claude/commands/` — populated (generated; stays out of the npm whitelist).

### Deliberately skipped

- **`export_record` / any paid or keyed surface.** Prompts and the generator are free and keyless (rule 3).
- **Promoting `Stage`/`Job`/`Gate mode` into structured frontmatter** — no consumer reads them (YAGNI).
- **A YAML parser dependency** — hand-rolled parser instead (rule 4, bundle hygiene).
- **MCP `title` field and the completion API** — deferred; `name` + free-text arguments suffice for v1.
- **Shipping `.claude/commands/` to installers** — it is an internal artifact, not in the npm whitelist.
- **Bundle-at-build load strategy** — runtime-read is used instead.
- **Any implementation sequence, tests-as-written, or code** — owned by `superpowers:writing-plans` / `executing-plans`, next session.

---

## Decisions (from the Gate-2 ledger, verbatim)

**Verified facts**
- **S4** — server substitutes `$ARGUMENTS`; generator preserves it literal. (Confirmed against the MCP SDK + spec rev **2025-06-18** — the rev this repo pins, SDK ≥1.13.0, installed 1.30.0: no client-side templating; `prompts/get` returns server-built messages.)
- **D7a** — prompts are user-controlled / on-demand, not model-standing context. (MCP spec rev 2025-06-18: prompts user-controlled, invoked by user choice such as slash commands; tools model-controlled.)

**Serve side**
- **D1** — problem-fit gets one *optional* `idea` arg (body gets a `$ARGUMENTS` point, treated as a careful product edit).
- **D2** — unknown prompt name → `McpError(InvalidParams)`, no paths leaked.
- **D3/D4** — CI validation test is primary enforcement (5 parse, each has `description`, exactly 5 expected names); runtime is graceful + isolated — prompt faults never take down the 3 tools; missing `prompts/` → `prompts/list` errors clearly (not silent `[]`); one bad file → only that `get` errors.
- **D5** — glob `prompts/*.md` (dynamic, single source per rule 1).
- **D7b** — rule 2 stays tool-scoped; add a ledger note recording the `prompts/list` surface cost + why it's out of the standing budget. `<4000` test unchanged.
- **D9** — runtime-read; eager scan at construction (for list), lazy body read at get; resolve via `import.meta.url` by walking up to the nearest ancestor directory containing `prompts/`, never cwd. (Equivalently `../../../prompts` — **three** hops — from the registry's compiled location `dist/src/prompts/index.js`, since `rootDir "."` compiles `src/prompts/index.ts` there; `../../prompts` would resolve to the nonexistent `dist/prompts`. Both the from-`dist` dev run and the installed-package run execute from `dist/src/`, so the anchor is identical.)
- **D12** — registry in `src/prompts/`.
- **D13** — intake MCP arg name = `idea`.
- **title** = skip (v1); **completion API** = none.

**Generator side**
- **D6** — prune orphans on generate, flag on check.
- **D8** — `--check`/drift in scope, as a `test/` drift test (also carries the D3/D4 validation). No new runner.
- **D10** — emit `description` (+ `argument-hint` where present) into `.claude/commands/<name>.md`.
- **D11** — generator core in `src/` (tsc-compiled, tested); thin `scripts/gen-commands.mjs` writer imports `dist/`. No new dep.

**Cross-cutting**
- **D14 + D16** — hand-rolled frontmatter parser (no new dep, rule 4); must strip only a *leading* `---…---`, never body `---` dividers.
- **D15** — prompt `description` copy is customer-facing menu text: write problem-fit's, review the other four — a `normal mode` writing task (caveman off for that copy).

*No decision was stubbed; the Master TBD Tracker is unchanged by Gate 2.*

---

## Docs affected

- **`src/API.md`** — §Prompts: add the input-schema column, drop "Not yet served," record the per-prompt argument contract (rule 8, same commit as the code).
- **`src/CONTEXT.md`** — add the rule-2 ledger note for the `prompts/list` surface (why prompts are outside the standing budget); tool ledger + `<4000` assertion unchanged.
- **`CLAUDE.md`** — Phase-1 checklist: flip the `.claude/commands/` generator item from "NOT built" to built; note the prompts are now MCP-served.
- **`planning/Roadmap.md`** — Phase-1 item 4 (generate `.claude/commands/`) and the "ships the five gates as prompts" goal move to done.
- **`README.md`** — document the newly served prompt surface (five gates invocable over MCP).
- **`prompts/*.md`** — normalization + problem-fit `description`/arg (this is source-of-truth product content, edited under rule 1).
- **`THIRD_PARTY_NOTICES.md`** — explicitly *unaffected*: no bundled-component or dependency change (hand-rolled parser, no YAML dep).
