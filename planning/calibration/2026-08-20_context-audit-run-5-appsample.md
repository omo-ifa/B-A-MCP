# context_audit — calibration run 5 (four application repos, app-sample pre-flight)

**Date:** 2026-08-20
**Tool commit:** `1c7ce68` (main — four sub-scores `bloat`/`orphans`/`routing_drift`/`coverage`, strict routing-path drift, per-router/chain bloat)
**Node:** v25.2.1 · **Token method:** `char-approx-v1` · **`calibrated`:** `false` (stubs active) · **No threshold resolved.**

Follows run-4 (`2026-08-20_context-audit-run-4-strict-drift.md`). This is the run the handoff flagged as "the big one": clone and audit the four **approved but UNVALIDATED** application repos — `apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost` — chosen from metadata, never from a run. Per the standing rule and task-observer observation #7, **the first action on each repo is a structural pre-flight (routing-convention / link-style census) before any number is treated as data** — each could route in a syntax the parser does not see.

> **Outcome: STOP before calibration — again, one tier up.** The pre-flight disqualified **all four** app repos as calibration data. Every one routes its context layer through a **root `AGENTS.md`** with `CLAUDE.md` a **symlink → `AGENTS.md`**. The tool recognizes `CLAUDE.md`/`CONTEXT.md` as routers but **not `AGENTS.md`**, and it **records-but-does-not-traverse the `CLAUDE.md` symlink**. So on all four the real root routing layer is **structurally invisible**, and every sub-score is measured off a small residue of stray nested `CLAUDE.md`/`CONTEXT.md` files. **No threshold (TBD-10/11/12) resolved. This is not the README sample.**

This is the census's STOP condition repeating at the application tier. The [provenance-and-routing census](2026-08-20_provenance-and-routing-census.md) stopped run-2 because **0/5** ecosystem repos routed via markdown links (all backtick). Run 5 finds the app repos route via backtick **too** — but inside `AGENTS.md`, a filename the tool does not read as a router at all.

Clones live under `~/dev/ba-calibration/{superset, posthog, cal.com, Ghost}`, shallow (`--depth 1`).

---

## 1. Pre-flight — routing-convention census (the STOP point)

**Question (per obs #7):** for each repo, where does the routing layer live, in what filename, and in what link syntax — and can the tool see it?

| Repo | HEAD | Root routing file | `CLAUDE.md` at root | Root convention (md-link / backtick-path) | Routers the **tool** sees | Routers that **exist** |
|---|---|---|---|---|---|---|
| **superset** | `18fc2c6` | `AGENTS.md` (15 983 B) | **symlink → `AGENTS.md`** | 0 md-link / 20 backtick-path | **1** (`superset/mcp_service/CLAUDE.md`, nested) | root `AGENTS.md` + 1 nested `CLAUDE.md` |
| **posthog** | `7bd2689` | `AGENTS.md` (39 589 B) | **symlink → `AGENTS.md`** | 0 md-link / 105 backtick-path | **1** (`products/review_hog/CONTEXT.md`, stray) | root + **44 `AGENTS.md`** + 1 `CONTEXT.md` |
| **cal.com** | `176037d` | `AGENTS.md` (9 225 B) | **symlink → `AGENTS.md`** | 0 md-link / 15 backtick-path | **1** (`specs/cancellation-reason-requirement/CLAUDE.md`) | root + 4 `AGENTS.md` + 1 nested `CLAUDE.md` |
| **Ghost** | `0cd3280` | `AGENTS.md` (3 296 B) | **symlink → `AGENTS.md`** | 0 md-link / 10 backtick-path | **3** (`apps/portal/CONTEXT.md`, 2× `.../services/*/CONTEXT.md`) | root + 4 `AGENTS.md` + 3 `CONTEXT.md` |

**Census result: 4/4 route via a root `AGENTS.md`; 4/4 alias it with a `CLAUDE.md` symlink; 0/4 route via markdown links.** Combined with the census five, the wild sample is now **9 repos, 0 markdown-link routing, 100% backtick-path routing.**

### The two compounding blind spots (both in `walk.ts`)

1. **`AGENTS.md` is not a router name.** `isRootName` (`walk.ts:16–18`) matches only `CLAUDE.md`/`CONTEXT.md` via `hasStructuralName`. An `AGENTS.md` is walked as an ordinary in-scope `.md` doc with `isRoot = false`. Its backtick paths are then treated as **prose** (`graph.ts:71` skips backtick edges from non-root docs), so posthog's 105 root routing spans — and every other `AGENTS.md` route in the tree — are ignored entirely.
2. **A `CLAUDE.md` symlink is recorded, not traversed.** `walk.ts:56–60` emits a `symlink` finding and `continue`s. So even the alias that *does* carry the recognized name is skipped. (This is correct *given* fix #1 — reading both would double-count `AGENTS.md`'s content — but on its own it means the one right-named file is invisible.)

Net: on all four, `stats.routing_files` collapses to the count of **stray nested `CLAUDE.md`/`CONTEXT.md`** files (1, 1, 1, 3), and the root routing layer — the thing the customer actually maintains — is never read.

---

## 2. Recorded artifact numbers (NOT DATA — do not calibrate against these)

Run for completeness and to document *how* the blind spot manifests, exactly as run-2 recorded superpowers' pre-fix artifacts. `stats.calibrated = false` throughout. **Every headline below is an artifact of the invisible root layer, not a measurement of the repo.**

| Repo | headline | bloat | orphans | routing_drift | drift split md/path | coverage | routing_files | routing_tokens | key artifact |
|---|:--:|---|---|---|:--:|---|:--:|---:|---|
| **superset** | **48** | 75/n1 | 1/n113 | 100/n6 | 0 / 0 | 3/n411 | 1 | 6 195 | coverage 3/n411 off one nested `mcp_service/CLAUDE.md` |
| **posthog** | **86** | 90/n1 | null/n0 | null/n0 | 0 / 0 | 84/n1819 | 1 | 3 207 | **coverage 84/n1819** off one stray `CONTEXT.md` — confidently wrong |
| **cal.com** | **42** | 100/n1 | null/n0 | null/n0 | 0 / 0 | 13/n240 | 1 | 195 | coverage 13/n240 off one spec-scoped `CLAUDE.md` |
| **Ghost** | **79** | 80/n3 | null/n0 | null/n0 | 0 / 0 | 79/n349 | 3 | 1 512 | coverage 79/n349 off three unrelated nested `CONTEXT.md` |

Finding-category counts: superset `{orphan:112, escapes_root:53, broken_ref:20, symlink:4, bloat:3}` · posthog `{broken_ref:81, symlink:45, escapes_root:33, malformed_link:2, bloat:2, routing_unresolved:1}` · cal.com `{broken_ref:32, symlink:4, escapes_root:2, routing_unresolved:1}` · Ghost `{symlink:20, bloat:2, escapes_root:1, malformed_link:1, routing_unresolved:1}`.

### What the artifacts reveal about the guards

- **The honest-vs-confident asymmetry (census §3) reproduces exactly.** On posthog/cal.com/Ghost the empty-routing-basis guards fire correctly: `orphans` and `routing_drift` go `null/n0` because the stray router resolves no root edges, and the `routing_unresolved` info finding fires. Those sub-scores fail **honestly**. **`coverage` does not** — it has no routing-basis guard, so posthog scores **coverage 84/n1819** off a single stray `CONTEXT.md`, a plausible-looking headline that is meaningless. This is the strongest evidence yet for the census §6 structural-guard proposal: extend the `n`-signal from "empty population" to "empty *routing basis*" for `coverage` too.
- **superset is the confidently-wrong low case.** Its one nested `mcp_service/CLAUDE.md` *does* resolve 6 backtick edges, so no guard trips — `orphans 1/n113` and `coverage 3/n411` are computed against a 411-directory repo as if that single service router were the whole context layer. Headline 48 is fabricated, not low.
- **`routing_drift` md-link vs path-missing split is 0/0 on all four.** Consistent with all prior runs: zero drift from broken markdown links anywhere in the wild sample. The sub-score is structurally incapable of firing via markdown links because no repo routes that way.

---

## 3. The real routing layer the tool cannot see (missed datapoints)

The root `AGENTS.md` files — the actual routers — carry real signal the tool never scores. Recorded so they survive:

| Repo | root `AGENTS.md` | ≈ char-approx tokens | backtick path spans | `AGENTS.md` files repo-wide |
|---|---:|---:|---:|---:|
| superset | 15 983 B | ≈ 3 995 | 20 | 2 |
| **posthog** | **39 589 B** | **≈ 9 897** | **105** | **44** |
| cal.com | 9 225 B | ≈ 2 306 | 15 | 4 |
| Ghost | 3 296 B | ≈ 824 | 10 | 4 |

- **posthog is a genuine TBD-11 top-end datapoint the tool is currently blind to.** A 9 897-token root router plus a 44-file `AGENTS.md` routing tree is exactly the multi-contributor bloat/depth case the app sample was meant to test. The tool measures its bloat off a 3 207-token stray `CONTEXT.md` instead. This datapoint is **valid only after `AGENTS.md` is recognized** — do not use the current artifact.
- **The app-repo premise is falsified.** The sample was selected on the theory that older multi-contributor apps route via markdown links, so `routing_drift` would finally catch real rot. They do not. They route via `AGENTS.md` backtick paths — the same convention as the solo ecosystem repos, just under a different filename. `routing_drift`-via-markdown-links has now failed to fire across all nine wild repos; it remains a check structurally unable to fire in this population.

---

## 4. Recommended next step (a decision, not auto-taken)

**Promote `AGENTS.md` router recognition to a v1 correctness finding**, exactly as the census promoted the backtick-path parser gap. This is the emerging cross-agent standard (`agents.md`), and it is now the dominant real-world root-routing filename in the target-customer population (the multi-contributor inherited repo). The tool's entire claim is to audit "this repo's routing layer"; on 4/4 approved app repos it audits a residue instead.

Scope questions for `/decisions` (do **not** auto-code — this changes the routing model):

1. **Add `AGENTS.md` to the router-name set** (`isRootName` / `hasStructuralName`). Consequence: `AGENTS.md` files become `isRoot`, their backtick paths become routing edges, `routing_files`/`routing_tokens`/reachability all recompute. Re-run all nine.
2. **Symlinked routers.** With `AGENTS.md` recognized, keeping the `CLAUDE.md`-symlink skip is correct (avoids double-counting the same content). But confirm the intended rule: a `CLAUDE.md → AGENTS.md` symlink should resolve to "same router already seen," not "a symlink finding that reads as a defect." Decide whether the `symlink` finding should suppress when the target is an already-scored router.
3. **`coverage` routing-basis guard** (census §6, now with stronger evidence). When routers resolve zero root edges, `coverage` should report `null`, not a fabricated 84. This is independent of #1 and worth resolving regardless.

Whatever lands goes on a branch + PR under `superpowers:test-driven-development` with the code reviewers, never direct to `main` (WORKFLOW rule). After the fix, re-run the four app repos **and** the census five (`AGENTS.md` recognition may change superpowers/caveman, which also carry `AGENTS.md`), then — and only then — revisit TBD-10/11/12 numbers.

---

## 5. TBD status — unchanged (all DEFERRED, rule 7)

- **TBD-10 (weights over four sub-scores)** — Open. Cannot move: the app sample that was meant to give `routing_drift` a real workout produced zero valid drift data (invisible routers).
- **TBD-11 (per-router / chain cutoff numbers)** — Open. posthog's ≈9 897-token root router + 44-file tree is a real top-end candidate, **currently unmeasurable**. `6000` still rejected as tautological self-tuning.
- **TBD-12 (`MIN_FILES`)** — Open. Coverage output is corrupted by the invisible root layer on 4/4; `MIN_FILES` cannot be read off it.
- **TBD-14 (orphan scope)** — Open, and **not advanced here**. `orphans` is `null` on 3/4 (guard fired) and an artifact on superset (1/n113 off a service router). The layout-vs-rot separation the app sample was supposed to provide needs the real routers visible first.
- **caveman-28 drift residue** — untouched; no second-pass evidence added.

**No threshold changed. caveman's influence on TBD-10/11 is untouched and still visible.** The blocker is now one tier higher than the census's: not "the instrument mis-reads the routing *syntax*" but "the instrument does not recognize the routing *file* the target-customer population has standardized on." Fix `AGENTS.md` recognition, then re-run — never off B-A-MCP alone, and the first post-fix run is calibration, not the README sample.
