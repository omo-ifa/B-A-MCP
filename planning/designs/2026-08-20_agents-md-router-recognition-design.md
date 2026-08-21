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
- **`root.method` label limitation (accepted for v1).** An `AGENTS.md`-only repo (no `CLAUDE.md` entry) anchors via the widened predicate but reports `root.method: "claude_md"` — a mislabel of the field that states the *basis* of the anchor. Accepted for v1 with a note in `src/API.md`; **no schema change, ships now.** The four app repos are honest (a `CLAUDE.md` symlink entry exists, so `claude_md` is correct there); only a pure `AGENTS.md`-only repo hits the mislabel. A distinct `agents_md` method value is a clean v1.1 item if such repos appear in the nine-repo re-run.
- **Graph (`graph.ts`).** Keys off `doc.isRoot`; it inherits the wider router set automatically — the router DAG, reachability, `refsFromRoots`, and bloat's root→leaf chains all recompute over `AGENTS.md` routers with no direct change to graph logic.
- **Interface/data shape.** Unchanged. `stats.routing_files` and `routing_tokens` take on their true (larger) values on these repos; that is corrected behavior, not a shape change.
- **Scope guard (rule 7).** `AGENTS.md` **only**. No `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`, or other speculative names until a run shows the population using them.

### D2 — `CLAUDE.md → AGENTS.md` symlink-alias dedup

- **Symlink handling (`walk.ts`), decided at WALK time.** Today every symlink emits a `symlink` info finding and is not traversed. New behavior, narrowly: a symlink whose target is the repo's real router is deduped — no `symlink` finding, no traversal. The decision is made **during the walk**, not from the scored router set: scoring runs after the walk, so router-set membership is not known mid-recursion. Three guards, in order:
  - **(a) Resolve + name-check.** Resolve the symlink target to a real path and dedup only if that target has a structural router name (`CLAUDE.md`/`AGENTS.md`/`CONTEXT.md`) and sits under root. The test is "target is a structural router under root," **not** "target already scored."
  - **(b) Root bound first.** Apply the root check before reading: if the target's realpath escapes root, do **not** read it and **keep** the `symlink` finding. Never read above root.
  - **(c) Target must actually be walked.** Dedup only if the target is genuinely in-scope and walked via its real path (not gitignored, not in a hard-skip dir, not otherwise excluded). If the target is out-of-scope, suppressing the finding **and** not traversing would silently drop the router's content — so in that case **keep** the finding.
- **Invariants preserved.** Never follow the link (the alias content is scored via the target's own real entry, not by traversing the link); never read above root. The router is scored exactly once, via its real non-symlink path.
- **Two-real-routers is not this case.** Dedup applies only to a symlink aliasing a real in-scope router. A repo that ships two *distinct real files* (e.g. a real `CLAUDE.md` and a real `AGENTS.md` with different contents) has two routers, both counted — not skipped.
- **Interface/data shape.** Unchanged. One fewer `symlink` finding in the true-alias case; no new category.

### D3 — `coverage` routing-basis guard

- **Coverage (`coverage.ts`), scoped to `routing_unresolved`.** `coverage` gains an empty-routing-basis guard scoped to the **routers-present-but-unreadable** case: when **`routing_files > 0 && resolvedRefsFromRoots === 0`** (the `routing_unresolved` state), `coverage` reports `null` ("not assessed") with `n = 0`, instead of a floored 0. This is deliberately **narrower** than the bare `resolvedRefsFromRoots === 0` that `orphans`/`routing_drift` use — see the next bullet.
- **Two wanted catches are preserved — this is why the guard is scoped, not bare.** (1) When routers resolve **≥ 1** edge but cover no significant directory, `coverage` still floors to **0** — the monolithic-route-nowhere repo (e.g. claude-mem `coverage 0 / n50`, one resolved root edge) stays caught. (2) When there are **no routers at all** (`root_absent`, `routing_files === 0`), `coverage` still floors to **0** so a no-context-layer repo with ≥ 1 significant directory yields headline **0** — the worst-case catch ratified in `planning/decisions/2026-08-20_headline-definite-when-significant-dirs.md` (headline is a definite number whenever ≥ 1 significant dir). A **bare** `resolvedRefsFromRoots === 0` trigger would wrongly flip that repo's coverage to `null`, regressing the invariant and its test. The `null` fires **only** in the `routing_unresolved` state.
- **Independent of D1.** Correct regardless: routers-present-but-zero-resolved is indistinguishable from a routing syntax the parser still cannot see. This scopes back the 2026-08-20 backtick/orphans-guard decision's assumption that zero resolved edges "almost always means the repo genuinely routes nothing," which run-5 falsified — but **only** for the routers-present case, not the no-router case.
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

- **D1 — `AGENTS.md` is a router (v1 correctness fix).** Add `AGENTS.md` to the router-name set (`isRootName` + the graph root set + the root-anchor tier). `AGENTS.md` becomes `isRoot = true`; its backtick paths become routing edges; `routing_files`/`routing_tokens`/reachability/bloat recompute. **`AGENTS.md` ONLY** (rule 7 — no speculative names). Root anchoring must be able to anchor on `AGENTS.md` (symlink case already fires; `AGENTS.md`-only repo needs the widened predicate). **Accepted `root.method` label limitation:** an `AGENTS.md`-only repo reports `method: "claude_md"` — noted in `src/API.md`, no schema change, `agents_md` deferred to v1.1 (see §3). Accepted consequence: blocks the README sample and TBD-10/11/12 numbers until all **nine** repos re-run post-fix.
- **D2 — symlink-to-router alias: dedup.** When a symlink's target is the repo's real router, emit no `symlink` finding and do not traverse it; every other symlink unchanged. Both invariants preserved (never follow the link, never read above root); the router is scored once via its real path. Decided at **walk time** by resolving the target and checking it is a structural router name under root **and** is actually walked in-scope — **not** by "already in the scored router set" (scoring runs after the walk). Full three-guard mechanism (resolve+name-check, root-bound-first, target-must-be-walked) in §3.
- **D3 — `coverage` routing-basis guard (scoped to `routing_unresolved`).** When **routers are present but none resolve** (`routing_files > 0 && resolvedRefsFromRoots === 0`), `coverage` reports `null` ("not assessed"), not a floored 0. Floor-to-0 is preserved in **both** other cases: ≥ 1 edge resolves but no significant dir covered (monolithic-route-nowhere), and **no routers at all** (`root_absent`) — the latter to hold the ratified invariant in `planning/decisions/2026-08-20_headline-definite-when-significant-dirs.md` (headline is a definite number, and 0 in the worst case, whenever ≥ 1 significant dir). `null` fires only in the `routing_unresolved` state.
- **D4 (sequencing)** — folded into D1: v1, not deferred.
- **D5 (recursive nested-router discovery)** — resolved by existing behavior; `AGENTS.md` just joins the name set.
- **D6 (re-run scope)** — resolved by standing rule: re-run all nine after D1+D3 land; never off B-A-MCP alone.
- **D7 (which filenames)** — resolved: `AGENTS.md` only now.
- **No new TBD stubbed** — D1–D3 are policy resolutions with no open numbers. TBD-10/11/12 remain open, now additionally gated on this fix landing + the nine-repo re-run.

## 5. Docs affected

Named, not diffed. The build phase writes the changes.

- **`src/API.md`** — update the MCP-surface description of `context_audit`: router-name set now includes `AGENTS.md`; `coverage` sub-score may be `null` in the `routing_unresolved` state; symlink-alias dedup behavior; and the **`root.method` label limitation** (an `AGENTS.md`-only repo reports `claude_md`; `agents_md` is a v1.1 item). Same commit as the code (rule 8).
- **`src/CONTEXT.md`** — re-verify the context-budget ledger entry for `context_audit` (expected unchanged); note the re-measure at `/handoff` (rule 2).
- **`src/TDD.md`** — already carries the run-5 notes on TBD-10/11/12 (gated on this fix + the nine-repo re-run); update those statuses again once the fix lands and the re-run produces data.
- **`planning/decisions/2026-08-20_agents-md-router-recognition.md`** — the resolved-decision record (already written); no further change unless the build surfaces a missed decision (ratchet back to `/decisions`).
- **`SESSION_HANDOFF.md`** — at session close, record the fix status, the pending nine-repo re-run, and that the README sample stays blocked until it runs.

**Test-scope notes for the build phase** (pointers for `superpowers:test-driven-development`, not tests — the build writes them):

- **D3 regression.** A no-router repo with ≥ 1 significant directory (`root_absent`, `routing_files === 0`) must keep `coverage` floor-to-0 → headline **0**; the existing `headline-definite-when-significant-dirs` regression test must stay green (the scoped guard must not flip it to `null`). Add a positive test for the `routing_unresolved` case (routers present, zero resolved) asserting `coverage: null`.
- **D2 regression.** A `CLAUDE.md`/`AGENTS.md` symlink whose target is gitignored / out-of-scope / escapes root must **keep** the `symlink` finding (suppression only when the target is actually walked in-scope). Add a true-alias test (target is a real in-scope router) asserting no `symlink` finding and the router scored exactly once.
