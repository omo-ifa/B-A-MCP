# Decision — the headline is a definite number (never null) whenever the repo has ≥1 significant directory

**Date:** 2026-08-20
**Status:** Resolved (invariant already satisfied by current code; lock with a test in the code pass)
**Decider:** B&A (product owner)
**Corrects:** the run-2 doc's claim that task-observer's null headline was a bug.

---

## The rule

- **≥1 significant directory → the headline is a definite number, never `null`.** A repo with real directories to cover but no routing is the worst case in the set and must **score as such** (low). `null` means "we couldn't measure", never "there's nothing here".
- **0 significant directories → the headline may be `null` (or high).** A repo with nothing to route is a small/docs-only repo; not scoring it is honest.

The discriminator is **significant directories**, not `routing_files`.

## The task-observer number (the question that had to be answered first)

**task-observer has ZERO significant directories** — zero source files anywhere in the repo (6 `.md`, 2 `.yml`, 2 `.png`, 1 `.txt`, 1 `.json`; no `.ts/.js/.py/...`). So task-observer is **not** the "no context layer" worst case — it is the "nothing to route" case. Its run-2 headline of `null` is therefore **correct**, not a bug. The earlier bug diagnosis was wrong and is withdrawn.

## Current code already satisfies the rule

`coverage` returns `null` **only** when `dirs.length === 0` (zero significant dirs); with ≥1 significant dir it returns a **number** (0 when uncovered — the `noClaudeRoot` / covers-nothing floor). The `headlineScore` routing-layer gate nulls **only** when all of `routing_drift`/`coverage`/`orphans` are null — which, since coverage is non-null whenever there is a significant dir, **cannot happen when ≥1 significant dir exists**. Verified empirically: a `git_root` repo with one significant `src/` dir and no routers → `coverage 0/n1` → **headline 0** (not null). The worst case already scores 0; task-observer (0 dirs) is already null.

## Decision

**Ratify the current behavior as the intended invariant** and **lock it with a regression test** in the code pass:

1. no routers + ≥1 significant directory → headline is a definite low number (e.g. 0), never null;
2. no routers + 0 significant directories → headline null is acceptable.

No production code change is required for this invariant; the code pass adds the test that pins it (so a future change to `headlineScore` or `coverage` can't silently break it).

## Non-goals

- Does not change `headlineScore` or `coverage` logic (already conformant). Does not set any number. Independent of the `broken_refs` removal and router-path-drift rulings (those do change code).
