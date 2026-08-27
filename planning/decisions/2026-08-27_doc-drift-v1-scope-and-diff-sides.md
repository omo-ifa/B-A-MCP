# Decision — `doc_drift` v1 scope and diff-sides (TBD-9 resolved)

**Date:** 2026-08-27
**Gate:** 2 (`/decisions`), following `superpowers:brainstorming`
**Resolves:** TBD-9 (`doc_drift` v1 scope)
**Opens:** TBD-22, TBD-23, TBD-24 (deferrals, stubbed)
**Status:** Resolved — cleared for Gate 3 (`/design-doc`)

---

## Context

`doc_drift` is Roadmap tool #3 (the *retention hook*) and the least-bounded of the
three free tools. Its founding design (`planning/designs/2026-08-18_ba-mcp-server-design.md`)
speced it as **two checks in one tool**: (a) **schema-of-record** — does `src/API.md` still
match the code; (b) **orientation** — can a memoryless agent still orient in the workspace
after drift (a continuous walk test). The original TBD-9 framing added a third, unbounded
axis: parsing migrations and routes across arbitrary frameworks. The founding "estimate risk"
note explicitly authorized **cutting `doc_drift` to Phase 2** if it resists.

This gate narrows v1 to a bounded, framework-agnostic core and stubs the rest.

---

## Two findings from the scoping pre-flight

Before choosing an input shape, two cheap empirical checks were run against the repo. Both
reshaped the decision (logged as task-observer Obs 30 — a scoping-phase structural pre-flight
can retire a candidate before design).

- **Finding 1 — B-A-MCP emits no machine-readable canonical artifact.** No `schema.json` /
  `tools-list.json` / `openapi.json` exists. The canonical tool schemas live only as
  **TypeScript object literals** (`inputSchema` / `outputSchema`) inside each tool's
  `index.ts`. So the "code-side truth" is not readable as a structured file — obtaining it
  means executing the server (`tools/list`, MCP-specific + not read-only) or parsing TS source
  (the rabbit hole). Neither fits a free, keyless, read-only tool.

- **Finding 2 — the doc deliberately diverges from the emitted schema.** `src/API.md`
  documents the **full** output shape, but the code's *declared* `outputSchema` is
  **intentionally minimized** (`subscores` / `findings` / `stats` declared as bare
  `{ type: "object" }`) to hold the rule-2 token budget. API.md says so verbatim: it
  documents "the structuredContent payload the tool actually returns, not the declared schema
  itself." There are three representations in play: doc-full, code-declared-minimal (what
  `tools/list` emits), runtime-payload-full (only observable by executing). A naive diff of
  doc-full ↔ emitted-minimal fires on the **deliberate** minimization — false drift.

**Consequence for the generic claim:** the bounded, framework-agnostic version of `doc_drift`
is a **structural diff between two provided schema representations**. It cannot self-discover
the canonical truth without executing or source-parsing. The tool is generic over *any*
`{declared, canonical}` schema pair (MCP `tools/list` dump, OpenAPI `openapi.json`, JSON Schema
file, GraphQL introspection, …); the *obtaining* of the canonical side sits outside the tool.

---

## Decision ledger

| # | Decision | Resolution |
|---|----------|------------|
| D1 | Build direction (build / defer / narrow) | **Narrow v1 = schema-of-record drift only.** Check (b) orientation is already effectively shipped inside `context_audit` (orphans/coverage/routing_drift = "can an agent orient"); the framework-migration axis is the unbounded part. Check (a) — schema-vs-code drift — is the one thing `context_audit` structurally cannot do (it never reads source contents). Build (a); defer the rest. |
| D2 | Input shape (the "two sides") | **Provided/inline** — the caller supplies both schemas (or an array of `{declared, canonical}` pairs). `doc_drift` is a pure structural differ; it never discovers, emits, executes, or reads source. Read-files was **considered and rejected** (see below). |
| D3 | Cardinality | **Array of pairs → one consolidated report**, mirroring `override_log`'s array→log. Each pair carries an optional `label` to identify the schema in findings and the rendered report. |
| D4 | Output shape | **`{ score, findings[], stats, rendered }`**, mirroring the two shipped tools. `rendered` also rides as `content[0].text`; the tool owns rendering, the agent displays it verbatim. |
| D5 | Error surface | Structured `INVALID_*` envelope for a **malformed call** (non-array input, or a pair that is not an object). A **missing/absent field** is a finding, never an error (guidance-with-override applied to the tool itself, as in `override_log`). |
| D6 | Keyless / read-only / stateless | File-free, no network, no key, deterministic (CLAUDE.md rule 3 + owner). The free/paid boundary stays at `export_record` alone. |
| D7 | Finding-id basis | Reuse the `stableId` formula (`sha256(...).slice(0,12)`), **duplicated, not imported** (a boundary test locks equivalence to `context_audit`'s `findingId` / `override_log`'s `stableId`, per Obs 5 + Obs 27). Discriminator = **identity** (category + pair-label + field-path), **never** the moving evidence (a field's type or value). |
| D8 | Score / severity shape | Rounded 0–100, **null on empty denominator** (never a fabricated 100 over nothing to compare), mirroring `override_log`. Severity keyed by drift-kind. Exact category names + numerator granularity are Gate-3 design detail. |
| D9 | **Opaque-node handling (Finding 2)** | **Wildcard — written as the definition, not a filter bolted on (Obs 10).** A `{ type: "object" }` node with no `properties` (or an explicit wildcard) declares "unspecified here," so **it matches any counterpart by definition** — no drift emitted, and none detected inside it. Finding 2's minimization is deliberate, so a differ that fires there fires on every minimized MCP schema — wrong by construction. **Conditional on D10:** the residual (deep drift inside an opaque node is invisible) is a silent false negative, which the visible-FP-over-silent-FN tie-breaker forbids **unless** there is documented recourse. That recourse is D10 ("feed a more complete canonical"). Recorded in a `context_audit`-§9-style accepted-limitations block. **Wildcard does not ship with D10 stubbed.** |
| D10 | Canonical-choice guidance | **Resolved (agnostic + generic recommendation).** The tool diffs whatever pair it is given. v1 documents a recommended canonical, **worded generically to preserve the framework-agnostic claim**: feed *the most complete canonical the caller can obtain without source-parsing or executing privileged code* — for an MCP server that is the runtime `tools/list` payload, for an OpenAPI service its `openapi.json`, for a GraphQL API its introspection result, etc. Not enforced. This is D9's documented recourse; it is **not** stubbed, because a stubbed D10 would leave D9's accepted limitation with no user recourse and quietly break the tie-breaker invariant. |
| D11 | Deferral — canonical self-discovery / read-files mode | **Stub → TBD-22.** Nothing blocked in v1. |
| D12 | Deferral — orientation walk-test | **Stub → TBD-23.** Nothing blocked in v1. |
| D13 | Deferral — framework migration/route parsing | **Stub → TBD-24.** Nothing blocked in v1. |

Nothing is OPEN. D3–D8 follow the mirror-`override_log` convention the owner endorsed; D9 and
D10 are recorded together because D10 is the precondition of D9's acceptance.

---

## Read-files — considered and rejected (not a live contest)

An alternative input shape had `doc_drift` read a doc path + a canonical-schema file path,
extract the doc's fenced `json` blocks, read the canonical JSON, and diff. It is rejected for
v1, on the findings above:

- **Finding 1** proves the tool cannot self-discover canonical truth without executing
  (MCP-specific, not read-only) or parsing TS (the rabbit hole). Read-files needs a committed
  canonical artifact that does not exist.
- **Finding 2** is the harder blow: the emitted `tools/list` is deliberately minimized, so
  read-files would either diff against the wrong canonical (false drift on an intentional
  minimization) or force B-A-MCP to author a third purpose-built canonical file plus a build
  step — heavier dogfooding, and no more generic.

Provided/inline absorbs both: because the caller supplies the pair, the tool never has to
arbitrate the three-representations problem — the caller picks the meaningful `{declared,
canonical}` pair for its context. The impure discovery step (run `tools/list`, capture the
runtime payload) relocates to the calling agent; `doc_drift` stays keyless, read-only, and
file-free — the purest mirror of `override_log`. Read-files is a candidate for the v1.1
self-service mode (TBD-22), not a v1 contest.

---

## Deferred (stubbed as new TBDs)

- **TBD-22 — canonical self-discovery (read-files mode).** A future mode where the tool reads a
  doc + a committed canonical artifact and aligns the pair itself. Blocked on a project actually
  committing a canonical artifact and on resolving Finding 2's representation choice.
- **TBD-23 — orientation walk-test.** The founding check (b). Deferred as redundant with
  `context_audit` until proven distinct.
- **TBD-24 — framework migration/route parsing.** The original unbounded TBD-9 axis. Deferred to
  Phase 2.

None blocks v1 — the provided/inline differ ships without any of them.

---

## Ratchet note

If Gate 3 (`/design-doc`) or a later gate surfaces a decision this ledger missed, return to
`/decisions` and log it here before continuing. The gate is one-way: an unresolved decision
must not slip into `writing-plans` as a silent assumption.
