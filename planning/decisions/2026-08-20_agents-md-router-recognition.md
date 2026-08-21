# Decision — `AGENTS.md` is a router; symlink-alias dedup; `coverage` routing-basis guard

**Date:** 2026-08-20
**Status:** Resolved (implementation deferred to the design-doc → code pass; no numbers)
**Decider:** B&A (product owner)
**Relates to:** `context_audit` router-name set, `walk.ts` symlink handling, `coverage` sub-score. Surfaced by calibration run-5 (`planning/calibration/2026-08-20_context-audit-run-5-appsample.md`). Scoped amendment to `planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md`.

---

## Why

Run-5's pre-flight of the four approved application repos (`apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost`) found **all four route their context layer through a root `AGENTS.md`**, with `CLAUDE.md` a **symlink → `AGENTS.md`**. The tool recognizes only `CLAUDE.md`/`CONTEXT.md` as routers and records-but-does-not-traverse the `CLAUDE.md` symlink, so on 4/4 the real root routing layer is **invisible** and every sub-score is computed off a residue of stray nested routers (headlines 48/86/42/79, all artifacts). This is the census's STOP condition one tier up: a dominant real-world routing convention the instrument cannot see. `AGENTS.md` is the emerging cross-agent standard and the routing file the target-customer population (inherited multi-contributor repos) has standardized on. Same reasoning as the backtick-parser-gap promotion: a convention the tool can't read is a **v1 correctness gap, not a v1.1 note.**

## Decisions

### D1 — `AGENTS.md` is a router (v1 correctness fix)

`AGENTS.md` joins `CLAUDE.md`/`CONTEXT.md` in the router-name set (`isRootName` / `hasStructuralName` in `walk.ts`, and the graph-root set). An `AGENTS.md` becomes `isRoot = true`: its backtick paths become routing edges, and `routing_files` / `routing_tokens` / reachability / bloat all recompute over it.

- **`AGENTS.md` ONLY.** Rule 7 holds — do **not** add `GEMINI.md`, `.cursorrules`, or any other speculative name until a run shows the repo population using it. The evidence is `AGENTS.md` (9/9 wild-sample repos that carry a context layer either use it or the backtick convention it wraps).
- **Root anchoring (design-doc confirmation, do not guess):** confirm whether `resolveRoot`'s `claude_md` tier already anchors correctly on the four app repos via their `CLAUDE.md` symlink, or whether the tier must explicitly anchor on `AGENTS.md` for an **`AGENTS.md`-only repo** (no `CLAUDE.md` present). Policy that follows from D1: root resolution must be able to anchor on `AGENTS.md`, consistent with it being a router. The *how* (does existing symlink behavior already cover the app-repo case) is a code-reading task for the design doc, not a guess to bake in now.
- **Accepted consequence:** blocks the README sample and TBD-10/11/12 **numbers** until **all nine** repos re-run post-fix (the census five carry `AGENTS.md` too — superpowers/caveman especially — so their prior figures may move). Never resolve a threshold off B-A-MCP's own run.

### D2 — symlink-to-router alias: dedup (suppress finding, don't traverse)

When a symlink's target resolves to an **in-scope router already scored via its real path** (the `CLAUDE.md → AGENTS.md` alias all four app repos ship), emit **no** `symlink` finding and do **not** traverse it — the alias is a standard convention, not a defect, and traversing would double-count `AGENTS.md`.

- **Narrow amendment only.** Every *other* symlink still emits the `symlink` info finding, unchanged.
- **Both hard invariants preserved:** never follow the link; never read above root. The target is scored only via its real, non-symlink path.
- **Guard shape (code pass):** resolve the target and dedup **only if** it is in-scope **AND** is a structural router. **Implementation refinement (design pass):** decide this at **walk time** — the target must resolve to a structural router name under root and be actually walked in-scope — **not** "already in the scored router set" (scoring runs after the walk, so that membership is unknown mid-recursion). Full three-guard mechanism in `planning/designs/2026-08-20_agents-md-router-recognition-design.md` §3 D2. Otherwise fall back to today's `symlink` finding.
- `src/API.md` updates in the same commit (rule 8).

### D3 — `coverage` routing-basis guard: `null` in the `routing_unresolved` state

Bring `coverage` closer to `orphans` and `routing_drift`, but **scoped**: when **routers are present and resolve zero edges** from any root (`routing_files > 0 && resolvedRefsFromRoots === 0` — the `routing_unresolved` state), `coverage` reports `null` ("not assessed"), **not** a floored 0. The scope is narrower than `orphans`/`routing_drift`'s bare `resolvedRefsFromRoots === 0` on purpose — see the `root_absent` carve-out.

- **Correct independent of D1.** Routers-present-but-zero-resolved is indistinguishable from a routing syntax the parser still can't see; posthog scored `coverage 84/n1819` off one stray router while its 44-file `AGENTS.md` tree went unread. This falsifies the assumption in the 2026-08-20 backtick/orphans-guard decision that zero resolved edges "almost always means the repo genuinely routes nothing" — for the routers-present case.
- **Preserve the wanted catch:** `coverage` still floors to **0** when routers resolve **≥1** edge but cover no significant directory — the monolithic-route-nowhere repo the tool exists to catch (e.g. claude-mem `coverage 0/n50` with 1 resolved root edge) **stays caught**.
- **`root_absent` carve-out (why the scope is `routing_files > 0`).** No routers at all + ≥1 significant directory still floors `coverage` to 0 → **definite headline 0**, so the no-context-layer worst case still scores as such. A bare `resolvedRefsFromRoots === 0` trigger would flip that to `null` and regress the headline-definite invariant.
- **Amends `planning/decisions/2026-08-20_headline-definite-when-significant-dirs.md`.** In the `routing_unresolved` state with ≥1 significant directory, `coverage`/`orphans`/`routing_drift` are all null → **headline null**, narrowing that record's "≥1 significant dir → never null" rule. That record is edited to carry the exception (one ruling, not two documents that disagree).
- `src/API.md` updates in the same commit (rule 8).

## Ledger housekeeping (from the /decisions gate)

- **D4 (sequencing)** — folded into D1: v1 correctness, not deferred.
- **D5 (recursive nested-router discovery)** — resolved by existing behavior; nested routers are already found, `AGENTS.md` just joins the name set.
- **D6 (re-run scope)** — resolved by standing rule: re-run all **nine** (app 4 + census 5) after D1+D3 land; never off B-A-MCP alone.
- **D7 (which filenames)** — resolved: `AGENTS.md` only now; speculative names are a rule-7 guess.
- **No new TBD stubbed** — D1–D3 are policy resolutions with no open numbers.

## Consequences

- `walk.ts` router-name set gains `AGENTS.md`; symlink handling gains the in-scope-router dedup. `graph.ts` root set follows. `coverage.ts` gains the scoped `routing_files > 0 && resolvedRefsFromRoots === 0 → null` guard (the `routing_unresolved` state; `root_absent` still floors to 0). `src/API.md` + the design doc update in the same commits.
- TBD-10/11/12 remain **open, data-blocked**, now additionally gated on this fix landing and the nine-repo re-run. posthog's ≈9 897-token root `AGENTS.md` + 44-file tree becomes a valid TBD-11 top-end datapoint **only after** D1 lands.
- Route: `/design-doc` (WHAT & WHY) → TDD build on a branch + PR under `superpowers:test-driven-development` with the code reviewers, never direct to `main`.

## Non-goals

- No threshold/number set (TBD-10/11/12 untouched). No change to the strict `routing_path_missing` shape rule or non-router backtick handling. No new router names beyond `AGENTS.md`. caveman's influence on TBD-10/11 stays visible, not baked in.
