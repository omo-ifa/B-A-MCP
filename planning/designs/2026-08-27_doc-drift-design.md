# `doc_drift` — schema-of-record drift differ (v1 design)

**Date:** 2026-08-27
**Status:** Design (Gate 3) — awaiting owner review
**Gate 2 ledger:** `planning/decisions/2026-08-27_doc-drift-v1-scope-and-diff-sides.md` (clean)

**One-liner.** A free, keyless tool that takes a caller-supplied `{declared, canonical}` schema
pair (or an array of them) and returns a structural diagnosis of the drift between them — a
completeness score, one finding per drifted field, and a rendered report — without reading any
file, running any code, or holding a key.

---

## Motivation

The B&A build loop's whole premise is that a documented record must keep matching reality.
`context_audit` (the acquisition hook) already checks the *routing* layer — whether an agent can
still orient in the workspace. But it explicitly never reads source-file contents, so it cannot
answer the other half of "does the record still match the code": **does a documented interface
still describe the interface the code actually exposes?** That gap is exactly where documentation
rots fastest — a schema block in a README or an `API.md` drifts from the code every time a field
is added, renamed, or retyped and the doc is not updated in the same commit.

`doc_drift` is the *retention hook*: the check a developer re-runs whenever they touch an
interface, because interface docs drift continuously. It serves the **developer (free tier)**
directly — it turns "is my documented schema still true?" from a manual eyeball into a scored,
reproducible record — and it serves the **consulting buyer** indirectly, as the third free tool
that makes the server worth keeping installed and the fourth artifact a paid `export_record` can
persist.

It is worth doing now because the two harder hooks are shipped (`context_audit`, `override_log`),
the loop machinery is warm, and — critically — v1 has been narrowed (Gate 2) from the founding
design's unbounded framing (parse migrations/routes across arbitrary frameworks) to a single
bounded, framework-agnostic core that mirrors the already-shipped `override_log` almost exactly.

---

## Architecture

`doc_drift` is a **pure structural differ over provided input** — the same class of tool as
`override_log`: structured input in, structured record out, no filesystem, no network, no key. The
one impure step schema-of-record checking needs — *obtaining* the canonical truth — is relocated
to the calling agent (which can run `tools/list`, read an `openapi.json`, etc.); the tool itself
only diffs the pair it is handed. That relocation is what keeps v1 keyless, read-only, and
framework-agnostic.

### Input (MCP tool input)

A single required key `pairs` — an **array** of comparison pairs, so one call diagnoses a whole
surface (e.g. every tool in a server) and renders one consolidated report:

- each pair has an optional `label` (to identify the schema in findings and the report), a
  `declared` schema (the doc's claim — e.g. the `json` block from `API.md`), and a `canonical`
  schema (the ground truth the caller obtained).
- both `declared` and `canonical` are **JSON-Schema-shaped objects** — the lingua franca that MCP
  tool schemas, OpenAPI, and (via introspection) GraphQL all share. Each field is optional at the
  schema level; a *missing* field is a finding, never a hard refusal (guidance-with-override
  applied to the tool itself). A malformed call — `pairs` not an array, or a pair member not an
  object — returns the structured error envelope, not a thrown exception. An **empty** `pairs`
  array is valid, not malformed: it resolves to `score: null` (a null denominator — nothing to
  compare), never `INVALID_*`.

### The comparison (what "drift" means)

The differ walks the two schemas' `properties` trees in parallel and, at each field path, emits at
most one of four drift kinds:

- **field-only-in-doc** — the declared schema has a field the canonical does not. The doc promises
  something the truth lacks (a consumer relying on the doc breaks). **High severity.**
- **field-only-in-canonical** — the canonical has a field the declared omits. The code exposes more
  than the doc records (the doc is merely incomplete). **Medium severity.**
- **type/shape mismatch** — a field present in both whose leaf `type` disagrees (doc says
  `string`, truth says `number`). Actively wrong. **High severity.**
- **required-drift** — a field whose `required` membership disagrees between declared and canonical
  (the doc marks a field required and the code made it optional, or the reverse). **High severity in
  both directions** — unlike presence, required-ness breaks either way: doc-required / code-optional
  misleads consumers, doc-optional / code-required breaks callers. Computed as a set diff of the
  `required` array at each object node; an opaque node has no `required` and is skipped identically
  to its property comparison.

Nested `properties` recurse. **Opaque nodes are wildcards (the definitional rule, not a filter):**
a `{ type: "object" }` node with no `properties` declares "unspecified here," so it matches any
counterpart — no drift is emitted at it (presence, `type`, or `required`) and recursion stops. This
is what lets a caller feed a deliberately-minimized schema (the emitted MCP `tools/list`, whose
nested nodes are intentionally opaque to hold a token budget) without the differ false-firing on
that minimization. The v1 comparison surface is **field presence (both directions) + leaf `type`
equality + `required`-membership at each object node**; richer keyword comparisons are deliberately
skipped (below).

### Output (MCP tool output — `structuredContent` + `content[0].text`)

Mirrors the two shipped tools: `{ score, findings[], stats, rendered }`.

- **score** — rounded 0–100, the share of compared field-paths that are in sync; **null** when there
  is nothing to compare (no non-opaque field-paths across any pair, including an empty `pairs`
  array), never a fabricated 100 over an empty denominator. **Opaque-wildcarded paths are excluded
  from the denominator entirely** — they are neutral, contribute no signal, and are never scored as
  in-sync. (Scoring them in-sync would make a fully-minimized schema read 100% and reward the exact
  Finding-2 minimization the wildcard rule exists to stay neutral about.)
- **findings[]** — one per drifted field, each with a stable `id`, a drift-kind category, a
  severity keyed by drift-kind, the pair `label` and field path, a message, and the evidence.
- **stats** — the counts the score derives from (pairs compared, fields compared, in-sync, drifted,
  by kind).
- **rendered** — a tool-built markdown report: a summary header (counts + drift %), one block per
  pair (its label, its drift findings), and the accepted-limitations note. The agent displays it
  verbatim.

### Finding id

Reuses the `stableId` formula (`sha256(...).slice(0,12)`) — **duplicated, not imported** (a
boundary test locks equivalence to `context_audit`'s `findingId` and `override_log`'s `stableId`,
so ids are comparable across tools without coupling `doc_drift` to another tool's category type).
The discriminator is the finding's **identity** — category + pair label + field path — never the
moving evidence (the field's declared/canonical type), so an id survives a value changing.

### Accepted limitations (recorded, `context_audit`-§9-style)

- **Deep drift inside an opaque node is invisible.** Because an opaque `{ type: "object" }` node is
  a wildcard, drift *within* the subtree it stands for is not detected. The documented recourse:
  feed a more complete canonical. This is the accepted silent-false-negative, licensed only by the
  canonical-choice guidance below — the differ never ships the wildcard rule without that recourse
  documented.
- **The canonical is the caller's responsibility, and the tool trusts it.** Like `override_log`
  trusting the events it is handed, `doc_drift` cannot tell a real canonical from a fabricated one.
  Unfakeability is the paid tier's property, not this tool's.
- **Colliding pair labels produce colliding finding ids.** The id keys on category + label + field
  path, so two pairs sharing a `label` (and a drifted field path) yield identical finding ids,
  distinguished only by position — the same latent edge `override_log` accepts on its entry ids. A
  downstream deduper must not key on the id alone.

### Canonical-choice guidance (documented, not enforced)

The tool is agnostic to which representation the caller supplies as `canonical`. v1 documents a
recommendation, worded to stay framework-agnostic: feed **the most complete canonical the caller
can obtain without source-parsing or executing privileged code** — for an MCP server the runtime
`tools/list` payload, for an OpenAPI service its `openapi.json`, for a GraphQL API its introspection
result, and so on. A less complete canonical (e.g. a deliberately-minimized declared schema)
surfaces only top-level surface drift; that is a valid, if shallower, use.

### Surface changes

- `server.ts` registers a third tool; `tools/list` returns **three** (`context_audit`,
  `override_log`, `doc_drift`).
- `src/API.md` gains a `### doc_drift` section (rule 8, same commit as the schema).
- The context-budget ledger in `src/CONTEXT.md` is re-measured (rule 2); the combined standing
  cost must stay under ~4000 tokens. Current total is 633, so a third tool of `override_log`'s
  order (~380) leaves ample headroom — but the number is measured, not assumed, at build.

### Deliberately skipped (out of scope for v1)

- **Canonical self-discovery / read-files mode** — the tool reading a doc + a committed canonical
  artifact and aligning the pair itself. Rejected for v1 by Findings 1–2 (see Decisions). → TBD-22.
- **Orientation walk-test** — the founding design's check (b) (can a memoryless agent still orient
  after drift). Redundant with `context_audit` until proven distinct. → TBD-23.
- **Framework migration/route parsing** — the original unbounded TBD-9 axis. → TBD-24.
- **Richer keyword comparison** — `enum`, `items`/array shape, `format`, `additionalProperties`
  semantics, description drift. v1 compares field presence + leaf `type` + `required`-membership;
  broader coverage is a later refinement, not a v1 obligation.
- **Non-schema JSON diffing** — inputs are assumed JSON-Schema-shaped (walk `properties`, compare
  `type`); diffing arbitrary non-schema JSON documents is not in scope.
- **String-encoded schemas** — inputs arrive as parsed objects; a JSON string is treated as a
  malformed pair member, not parsed.

---

## Decisions (from the Gate 2 ledger, verbatim)

Full ledger and the two scoping findings (Finding 1: B-A-MCP emits no committed canonical artifact
— schemas are TS literals; Finding 2: the doc deliberately diverges from the minimized emitted
schema) live in `planning/decisions/2026-08-27_doc-drift-v1-scope-and-diff-sides.md`.

- **D1 — build direction.** Narrow v1 = schema-of-record drift only. Orientation is effectively
  shipped inside `context_audit`; framework-migration is the unbounded axis; schema-vs-code drift
  is the one thing `context_audit` structurally cannot do.
- **D2 — input shape.** Provided/inline — the caller supplies both schemas. `doc_drift` never
  discovers, emits, executes, or reads source. Read-files considered and **rejected** (Findings 1–2).
- **D3 — cardinality.** Array of pairs → one consolidated report (mirrors `override_log`); each pair
  carries an optional `label`.
- **D4 — output shape.** `{ score, findings[], stats, rendered }`; `rendered` also rides as
  `content[0].text`; the tool owns rendering.
- **D5 — error surface.** Structured `INVALID_*` envelope for a malformed call (non-array input, or
  a pair that is not an object); a missing *field* is a finding, never an error.
- **D6 — keyless / read-only / stateless.** File-free, no network, no key, deterministic (rule 3).
- **D7 — finding-id basis.** Reuse `stableId`, duplicated not imported (boundary test), discriminator
  = identity (category + label + field-path), never the moving evidence.
- **D8 — score / severity shape.** Rounded 0–100, null on empty denominator; severity keyed by
  drift-kind. Category names + numerator granularity settled in this design.
- **D9 — opaque-node handling.** Wildcard, written as the definition (Obs 10). An opaque
  `{ type: "object" }`-no-`properties` node matches any counterpart — no drift emitted or detected
  inside. Conditional on D10 as its documented recourse; recorded as an accepted limitation.
- **D10 — canonical-choice guidance.** Resolved (agnostic + generic recommendation): feed the most
  complete canonical obtainable without source-parsing or executing privileged code. Not enforced;
  is D9's recourse; not stubbed.
- **D11–D13 — deferrals.** Canonical self-discovery → **TBD-22**; orientation walk-test → **TBD-23**;
  framework migration/route parsing → **TBD-24**. None blocks v1.

---

## Docs affected

Named, not diffed — the changes land in the build commits, not here.

- **`src/API.md`** — new `### doc_drift` section: input schema (`pairs` array), output schema
  (`{ score, findings[], stats, rendered }`), error envelope, invariants, the accepted-limitations
  and canonical-choice notes. Same commit as the tool schema (rule 8). Tools table gains a
  `doc_drift` row; its status flips to `Building` on the branch, `Shipped` only on trunk.
- **`src/CONTEXT.md`** — context-budget ledger: a `doc_drift` row with the measured standing token
  cost, and the combined total re-asserted under ~4000 (rule 2).
- **`planning/Roadmap.md`** — Phase 1 build-order item 3 (`doc_drift`) status line updated to reflect
  the narrowed v1 scope and its build state.
- **`src/TDD.md`** — already updated at Gate 2 (TBD-9 resolved; TBD-22/23/24 opened). No further
  change here.
- **`CLAUDE.md`** — Phase-1 checklist `doc_drift` item already annotated at Gate 2; ticks when
  shipped.
- **`SESSION_HANDOFF.md`** — refreshed at `/handoff` to record the shipped tool and the new state.
- **`.claude/commands/`** — **not** touched: `prompts/` is unchanged, so no regeneration (rule 1).
