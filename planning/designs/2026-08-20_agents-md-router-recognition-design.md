# Design — `AGENTS.md` router recognition, symlink-alias dedup, coverage routing-basis guard

**One-line summary.** Teach `context_audit` to read the `AGENTS.md` routing convention (the standard the target-customer repos actually use), dedup the `CLAUDE.md → AGENTS.md` symlink alias so it is not mis-flagged or double-counted, and make `coverage` report "not assessed" when the routing layer resolves nothing — closing the run-5 blind spot where all four approved app repos scored artifacts off invisible routers.

---

## 1. Title + summary

See above. This is a **v1 correctness fix**, not a feature: without it the tool audits a residue of stray nested routers instead of the real routing layer on the exact repo population it is sold to audit (inherited, multi-contributor). Scope is three coupled changes (D1–D3 from Gate 2), no new tool, no threshold numbers.

## 2. Motivation

**The problem, and who it serves.** The one paying audience for `context_audit` is a developer auditing an **inherited repo they have not fully read** — the free reasoning tool that becomes the lead-gen path to the consulting buyer. Calibration run-5 cloned the four approved application repos (`apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost`) and found **4/4 route their context layer through a root `AGENTS.md`**, with `CLAUDE.md` a **symlink → `AGENTS.md`**. The tool recognizes only `CLAUDE.md`/`CONTEXT.md` as routers and records-but-does-not-traverse the symlink, so:

- The real root routing layer is **invisible** on all four. Every sub-score is computed off stray nested routers (headlines 48 / 86 / 42 / 79 — all artifacts).
- posthog is the worst case: `coverage 84 / n1819` scored off a single stray `CONTEXT.md` while its 44-file `AGENTS.md` routing tree went unread — a plausible-looking, confidently-wrong headline.

**Why now.** `AGENTS.md` is the emerging cross-agent standard and is already the dominant real-world root-routing filename in the customer population. This is the census's STOP condition one tier up: a routing convention the instrument cannot see is a v1 correctness gap (same reasoning that promoted the backtick-parser-gap fix), not a v1.1 note. It **blocks** the README sample and the TBD-10/11/12 threshold numbers — none can be trusted until the tool reads the convention every real repo uses.

**Which side it serves.** Free tier (the reasoning). No paid-tier / `export_record` surface is touched; the free/paid boundary (rule 3) is unchanged.

## 3. Architecture

Three coupled changes across the existing `context-audit` module. No new files, no new tool, no new finding category, no MCP schema widening.

### D1 — `AGENTS.md` joins the router-name set

- **Router recognition (`walk.ts`).** The predicate that marks a walked doc `isRoot` currently accepts `CLAUDE.md`/`CONTEXT.md`; it gains `AGENTS.md`. An `AGENTS.md` then walks as `isRoot = true`, so its backtick paths become routing edges (today they are dropped as prose, because the graph only reads backtick edges from `isRoot` docs).
- **Root anchoring (`root.ts`).** The `resolveRoot` `claude_md` tier detects a root by directory-name match. Confirmed from the code: it uses `readdirSync`, which returns the entry name regardless of symlink status, so the app repos' `CLAUDE.md` symlink **already fires** the tier (run-5 shows `method: claude_md` on all four). The gap is an **`AGENTS.md`-only repo** with no `CLAUDE.md` present — it would fall through to `git_root`. So the root-detection predicate widens to `CLAUDE.md` **or** `AGENTS.md`. (`hasStructuralName` already accepts `"AGENTS.md"` as a valid name argument; the narrowing is only in the root-detection helper and `walk`'s router predicate.)
- **Graph (`graph.ts`).** Keys off `doc.isRoot`; it inherits the wider router set automatically — the router DAG, reachability, `refsFromRoots`, and bloat's root→leaf chains all recompute over `AGENTS.md` routers with no direct change to graph logic.
- **Interface/data shape.** Unchanged. `stats.routing_files` and `routing_tokens` take on their true (larger) values on these repos; that is corrected behavior, not a shape change.
- **Scope guard (rule 7).** `AGENTS.md` **only**. No `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`, or other speculative names until a run shows the population using them.

### D2 — `CLAUDE.md → AGENTS.md` symlink-alias dedup

- **Symlink handling (`walk.ts`).** Today every symlink emits a `symlink` info finding and is not traversed. New behavior, narrowly: when a symlink's target resolves to an **in-scope router already scored via its real path** (the `CLAUDE.md → AGENTS.md` alias), emit **no** finding and do not traverse it. Every other symlink is unchanged.
- **Invariants preserved.** Never follow the link; never read above root. The target is scored exactly once, via its real non-symlink path.
- **Two-real-routers is not this case.** Dedup applies only to a symlink aliasing an already-scored router. A repo that ships two *distinct real files* (e.g. a real `CLAUDE.md` and a real `AGENTS.md` with different contents) has two routers, both counted — not skipped.
- **Interface/data shape.** Unchanged. One fewer `symlink` finding in the alias case; no new category.

### D3 — `coverage` routing-basis guard

- **Coverage (`coverage.ts`).** `coverage` gains the same empty-routing-basis guard `orphans` and `routing_drift` already carry: when routers resolve **zero** edges from any root (`resolvedRefsFromRoots === 0`), `coverage` reports `null` ("not assessed") with `n = 0`, instead of a floored 0.
- **The wanted catch is preserved.** When routers resolve **≥ 1** edge but cover no significant directory, `coverage` still floors to **0** — the monolithic-route-nowhere repo the tool exists to catch (e.g. claude-mem `coverage 0 / n50` with one resolved root edge) stays caught. The `null` triggers strictly at exactly zero resolved root edges.
- **Independent of D1.** Correct regardless: zero resolved root edges is indistinguishable from a routing syntax the parser still cannot see. This scopes back the 2026-08-20 backtick/orphans-guard decision's assumption that zero resolved edges "almost always means the repo genuinely routes nothing," which run-5 falsified.
- **Interface/data shape.** The `Subscore` type already permits `score: null`; the MCP `outputSchema` already types `subscores` loosely. No schema change — the headline can now be `null` on a repo whose routers resolve nothing even when significant directories exist, which is the intended honest signal.

### Surface changes (summary)

- **MCP tool schema:** none (input and output schemas unchanged; `coverage: null` already representable).
- **Behavior:** `AGENTS.md` repos now score off their real routers; the symlink alias stops producing a spurious finding; `coverage` returns `null` at zero routing basis.
- **Context budget (rule 2):** the standing tool-definition cost is driven by the description + schema, neither of which needs to change; expected impact **none**. Re-verify and log at `/handoff`.

### Deliberately skipped

- **Any router filename beyond `AGENTS.md`** — `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`, `.mdc`, etc. Rule 7: not until a run shows them.
- **Following symlinks / reading above root** — invariants explicitly retained, not relaxed.
- **Threshold numbers (TBD-10/11/12)** — out of scope. This fix *unblocks* the data that will later resolve them; it sets no number.
- **The nine-repo re-run** — a calibration task that follows this build, not part of it.
- **Fenced-code-block tracking in `extractLinks`** — the pre-existing known over-linking limitation is untouched.
- **TBD-14 orphan scope and the caveman-28 drift residue** — separate open items; not addressed here.
- **`CONTEXT.md` at the root-anchor tier** — root anchoring stays `CLAUDE.md`/`AGENTS.md`; `CONTEXT.md` remains a nested router only, as today.

## 4. Decisions (verbatim from the Gate 2 ledger)

Resolved 2026-08-20 by the product owner; full reasoning in `planning/decisions/2026-08-20_agents-md-router-recognition.md`.

- **D1 — `AGENTS.md` is a router (v1 correctness fix).** Add `AGENTS.md` to the router-name set (`isRootName` + the graph root set + the root-anchor tier). `AGENTS.md` becomes `isRoot = true`; its backtick paths become routing edges; `routing_files`/`routing_tokens`/reachability/bloat recompute. **`AGENTS.md` ONLY** (rule 7 — no speculative names). Root anchoring must be able to anchor on `AGENTS.md` (symlink case already fires; `AGENTS.md`-only repo needs the widened predicate). Accepted consequence: blocks the README sample and TBD-10/11/12 numbers until all **nine** repos re-run post-fix.
- **D2 — symlink-to-router alias: dedup.** When a symlink's target resolves to an in-scope router already scored via its real path, emit no `symlink` finding and do not traverse it; every other symlink unchanged. Both invariants preserved (never follow the link, never read above root); target scored once via its real path. Guard: dedup only if the target is in-scope AND already in the scored router set, else fall back to today's `symlink` finding.
- **D3 — `coverage` routing-basis guard.** When `resolvedRefsFromRoots === 0`, `coverage` reports `null` ("not assessed"), not a floored 0. Floor-to-0 preserved when ≥ 1 edge resolves but no significant directory is covered. `null` triggers strictly at exactly zero resolved root edges.
- **D4 (sequencing)** — folded into D1: v1, not deferred.
- **D5 (recursive nested-router discovery)** — resolved by existing behavior; `AGENTS.md` just joins the name set.
- **D6 (re-run scope)** — resolved by standing rule: re-run all nine after D1+D3 land; never off B-A-MCP alone.
- **D7 (which filenames)** — resolved: `AGENTS.md` only now.
- **No new TBD stubbed** — D1–D3 are policy resolutions with no open numbers. TBD-10/11/12 remain open, now additionally gated on this fix landing + the nine-repo re-run.

## 5. Docs affected

Named, not diffed. The build phase writes the changes.

- **`src/API.md`** — update the MCP-surface description of `context_audit`: router-name set now includes `AGENTS.md`; `coverage` sub-score may be `null` at zero routing basis; symlink-alias dedup behavior. Same commit as the code (rule 8).
- **`src/CONTEXT.md`** — re-verify the context-budget ledger entry for `context_audit` (expected unchanged); note the re-measure at `/handoff` (rule 2).
- **`src/TDD.md`** — already carries the run-5 notes on TBD-10/11/12 (gated on this fix + the nine-repo re-run); update those statuses again once the fix lands and the re-run produces data.
- **`planning/decisions/2026-08-20_agents-md-router-recognition.md`** — the resolved-decision record (already written); no further change unless the build surfaces a missed decision (ratchet back to `/decisions`).
- **`SESSION_HANDOFF.md`** — at session close, record the fix status, the pending nine-repo re-run, and that the README sample stays blocked until it runs.
