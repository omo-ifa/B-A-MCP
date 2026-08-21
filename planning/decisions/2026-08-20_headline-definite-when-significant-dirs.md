# Decision — the headline is a definite number (never null) whenever the repo has ≥1 significant directory

**Date:** 2026-08-20
**Status:** Resolved; **amended 2026-08-20** (cases 1–2 already satisfied by current code; case 3 — the `routing_unresolved` exception — is new code in the D3 coverage guard). Lock all three with tests in the code pass.
**Decider:** B&A (product owner)
**Corrects:** the run-2 doc's claim that task-observer's null headline was a bug.
**Amended:** 2026-08-20 — narrowed for the `routing_unresolved` state by **D3** of `2026-08-20_agents-md-router-recognition.md` (ratcheted through /decisions). See **Amendment** below.

---

## The rule

- **≥1 significant directory → the headline is a definite number, never `null` — EXCEPT the `routing_unresolved` state** (routers present, zero resolved from any root; see **Amendment**). A repo with real directories to cover but no routing is the worst case in the set and must **score as such** (low). `null` means "we couldn't measure", never "there's nothing here" — the one measured exception being routers that are present but resolve nothing, where "we couldn't measure" is literally true.
- **0 significant directories → the headline may be `null` (or high).** A repo with nothing to route is a small/docs-only repo; not scoring it is honest.

The discriminator is **significant directories**, not `routing_files`.

## The task-observer number (the question that had to be answered first)

**task-observer has ZERO significant directories** — zero source files anywhere in the repo (6 `.md`, 2 `.yml`, 2 `.png`, 1 `.txt`, 1 `.json`; no `.ts/.js/.py/...`). So task-observer is **not** the "no context layer" worst case — it is the "nothing to route" case. Its run-2 headline of `null` is therefore **correct**, not a bug. The earlier bug diagnosis was wrong and is withdrawn.

## Current code already satisfies the rule

`coverage` returns `null` **only** when `dirs.length === 0` (zero significant dirs); with ≥1 significant dir it returns a **number** (0 when uncovered — the `noClaudeRoot` / covers-nothing floor). The `headlineScore` routing-layer gate nulls **only** when all of `routing_drift`/`coverage`/`orphans` are null — which, since coverage is non-null whenever there is a significant dir, **cannot happen when ≥1 significant dir exists**. Verified empirically: a `git_root` repo with one significant `src/` dir and no routers → `coverage 0/n1` → **headline 0** (not null). The worst case already scores 0; task-observer (0 dirs) is already null.

## Decision

**Ratify the current behavior as the intended invariant** and **lock it with a regression test** in the code pass:

1. no routers + ≥1 significant directory → headline is a definite low number (e.g. 0), never null;
2. no routers + 0 significant directories → headline null is acceptable;
3. **routers present but zero resolved (`routing_unresolved`) + ≥1 significant directory → headline `null`** (the Amendment — coverage cannot be measured).

Cases 1–2 require no production code change and are already conformant. **Case 3 is new code** (the D3 `coverage` guard in `coverage.ts`) and its regression test uses a fixture **WITH ≥1 significant directory** — routers present, none resolving — asserting `coverage: null` AND `headline: null`. The two case-1/2 tests stay unchanged and green.

## Amendment (2026-08-20) — the `routing_unresolved` exception

Narrowed by **D3 of `planning/decisions/2026-08-20_agents-md-router-recognition.md`** (ratcheted through /decisions after run-5 surfaced the AGENTS.md blind spot). One ruling, not two documents that disagree — the same discipline the backtick/orphans-guard record used when it amended the confidence-signal record.

**The exception.** In the **`routing_unresolved` state** — routers present but resolving **zero** edges from any root (`routing_files > 0 && resolvedRefsFromRoots === 0`) — `coverage` reports `null` even when ≥1 significant directory exists. With `orphans` and `routing_drift` also null in that state (empty routing basis), the headline is `null`. This is the honest signal: the routing layer exists but the tool cannot read it (an unrecognized routing filename/syntax — e.g. the pre-fix AGENTS.md case — or a genuinely broken router), so coverage **cannot be measured**. This is the one case where `null` at ≥1 significant dir is correct, not a bug.

**Unchanged: `root_absent`.** No routers at all (`routing_files === 0`) with ≥1 significant directory still floors `coverage` to 0 → **definite headline 0**. The no-context-layer worst case still scores as the worst case. The exception is gated strictly on `routing_unresolved`; it never touches `root_absent`.

## Non-goals

- The **original** ruling changed no `headlineScore`/`coverage` logic (cases 1–2 already conformant). The **amendment** (case 3) adds the D3 `coverage` guard. Does not set any number. Independent of the `broken_refs` removal and router-path-drift rulings.
