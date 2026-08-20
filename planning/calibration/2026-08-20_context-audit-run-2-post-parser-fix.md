# context_audit — calibration run 2 (five repos, post parser-fix)

**Date:** 2026-08-20
**Tool commit:** `72a012a` (main, after PR #7 — backtick routing edges + orphans empty-basis guard)
**Node:** v25.2.1 · **Token method:** `char-approx-v1` · **`calibrated`:** `false` (stubs active)
**Stub thresholds in effect (unchanged — no threshold resolved):**
`TBD_10_WEIGHTS = {broken_refs:3, routing_drift:3, orphans:2, coverage:2, bloat:1}`;
`TBD_11 = {ROUTING_TOKEN_CUTOFF:4000, INLINE_RATIO_CUTOFF:0.85, INLINE_MIN_TOKENS:200, DEPTH_CUTOFF:4}`;
`TBD_12 = {MIN_FILES:5, SOURCE_EXTS:[.ts,.js,.tsx,.jsx,.py,.go,.rs,.java,.rb]}`.

Repos: `~/dev/ba-calibration/{superpowers, caveman, claude-mem, one-skill-to-rule-them-all (=task-observer), icm-architect}` at the HEADs recorded in the provenance census (`2026-08-20_provenance-and-routing-census.md` §1).

> **This is NOT the README sample.** It is the first calibration run where the routing sub-scores actually assess the backtick routing convention (the census's whole point). No threshold (TBD-10/11/12) is resolved here — see "TBD revisit" below.

---

## Full results (every sub-score `score/n`)

| Repo | method | routers | routing_tokens | **score** | routing_drift | coverage | orphans | broken_refs | bloat | zero-edge? |
|---|---|---:|---:|:---:|---|---|---|---|---|:---:|
| **superpowers** | claude_md | 1 | 2 211 | **63** | 100 / n3 | 100 / n1 | 0 / n61 | 35 / n37 | 90 / n1 | no |
| **caveman** | claude_md | 23 | **45 419** | **75** | 100 / n252 | 89 / n35 | 25 / n105 | 100 / n118 | **0** / n23 | no |
| **claude-mem** | claude_md | 1 | 262 | **38** | 100 / n1 | **0** / n50 | 0 / n61 | 10 / n178 | 90 / n1 | no |
| **task-observer** | git_root | 0 | 0 | **null** | null / n0 | null / n0 | null / n0 | null / n0 | null / n0 | n/a (no routers) |
| **icm-architect** | git_root | 2 | 446 | **null** | null / n0 | null / n0 | null / n0 | 100 / n11 | 90 / n2 | **YES** |

Finding-category counts: superpowers `{broken_ref:24, orphan:61, bloat:1, symlink:1}` · caveman `{orphan:79, bloat:24}` · claude-mem `{broken_ref:160, orphan:61, escapes_root:5, bloat:1, symlink:2}` · task-observer `{root_absent:1}` · icm-architect `{root_absent:1, bloat:1, routing_unresolved:1}`.

## The parser fix worked (vs. run-1 / census evidence runs)

- **Backtick routing is now assessed.** Every repo with a routing root now produces real `routing_drift` (superpowers n3, caveman n252, claude-mem n1) instead of run-1's `not assessed (n=0)`. caveman's 252 resolving root edges across 23 nested routers is the clearest proof the root-relative + nested-router handling works.
- **The confident false positives are gone.** superpowers is no longer 61 *phantom* orphans + a fabricated 24; its 61 orphans are now a **real** assessment against a router that resolves only 3 edges (see "skill-repo orphans" below), and its routing/coverage read 100.
- **The guard and the headline gate both fired correctly on a real repo.** **icm-architect** is the one repo that hits **zero resolving routing edges after the fix**: its only routers are the two `assets/templates/{CLAUDE,CONTEXT}.md` scaffolds whose placeholder backtick paths don't resolve. Result: `routing_unresolved` info finding fired, `routing_drift`/`coverage`/`orphans` are all null, and the **headline is null** (not a fabricated number off `bloat`/`broken_refs` alone). This is exactly the behavior the guard + headline routing-layer gate were designed for.

## Zero-edge census (the question the amendment asked)

**After the fix, exactly one of the five hits zero resolving routing edges: icm-architect** (routers present, none resolve → `routing_unresolved`). **task-observer** has *no routers at all* (0 routing files → `root_absent`, headline null) — a distinct state, not "routers that resolve nothing." The other three (superpowers, caveman, claude-mem) all resolve backtick edges and are assessed normally. So the backtick parser turned "4 of 5 unparseable" (census) into "3 of 5 fully assessed, 1 zero-edge, 1 no-router."

## Per-repo notes worth calibration attention

- **caveman — the genuine TBD-11 top end, and a metric-design flag.** 23 routers, **45 419** total routing tokens → `bloat` saturates to **0**. This is the first non-tautological bloated datapoint (an external polyglot monorepo, not B-A-MCP). BUT it exposes a *design* question, not just a number: a flat `ROUTING_TOKEN_CUTOFF` on the **total** across all routers penalizes a large, legitimately-structured monorepo (23 `CONTEXT.md`/`CLAUDE.md` files is arguably appropriate for its size) exactly like genuine bloat. The cutoff may need to be **per-router or size-normalized**, not a flat total. Recording the datapoint (45 419) AND the design question.
- **claude-mem — validates the coverage floor-to-0 "catch, don't go quiet".** A 262-token, ~one-screen `CLAUDE.md` that routes to nothing, over **50** significant directories → `coverage` **0/n50**. This is precisely the monolithic-inline-and-route-nowhere repo the product owner wanted caught, and the floor-to-0 (kept, un-guarded) caught it. Also `broken_refs` **10/n178** (160 broken non-root markdown links) — either real doc rot or TBD-13-style example links; not yet distinguished.
- **superpowers — skill-repo orphans.** 61 orphans / 61 candidates: skill docs (`skills/*/SKILL.md`) are harness-discovered, not markdown-routed, so "unreachable from the routing root" is *true* but arguably not *bad* for this repo type. A candidate future refinement to the orphan definition (out of scope here); flagged.
- **task-observer / icm-architect — the null-headline floor works** for both the no-router (root_absent) and routers-resolve-nothing (routing_unresolved) cases.

## TBD revisit — data richer, but thresholds stay STUBBED (rule 7)

Per the amendment: resolution is conditional. The set is still mostly small Claude-Code-ecosystem tooling (n≈1 on convention), now with **one** genuinely different large repo (caveman). Assessment per TBD:

- **TBD-10 (weights) — DEFER.** Two blockers surfaced by this run: (1) `routing_drift` is **non-discriminating** — it reads 100 on every repo that has routers (superpowers, caveman, claude-mem all 100), because routers overwhelmingly point at files that exist; weighting it at the top tier (3) spends weight on a near-constant. (2) `broken_refs` is **polluted by TBD-13** (illustrative example links in prose/teaching docs — superpowers 24, claude-mem's 160 are suspect), so its 10/35/100 spread is not yet trustworthy signal. Resolving weights now would bake both artifacts in.
- **TBD-11 (bloat thresholds) — DEFER, with a recorded datapoint and a design question.** caveman (45 419 tokens, 23 routers) is a real top-end, but it shows a flat total-token cutoff likely mis-penalizes large monorepos. Spread of totals now: 262 / 446 / 2 211 / 4 619 (B-A-MCP) / 45 419 — clean small, borderline mid, saturated large. Enough to *inform* a per-router or normalized cutoff design, **not** to lock the flat-total number that this run shows is the wrong shape.
- **TBD-12 (coverage significance) — DEFER.** Now real layout spread: significant-dir counts of 1 / 2 / 35 / 50 at `MIN_FILES=5`. claude-mem's **50** significant dirs from a tiny repo raises "is 5 too low (over-counting significant dirs)?" — a real question the data poses but does not answer. The floor-to-0 policy is validated; the significance *number* is not resolved.

**No threshold changed.** The blocker has shifted from "the instrument can't see real routing" (run-1) to "the data now exposes signal-quality (TBD-13) and metric-shape questions that must be settled before numbers are meaningful." Next unlocks: resolve TBD-13 (so `broken_refs` is trustworthy), decide TBD-11's cutoff *shape* (per-router vs total), then re-run and resolve numbers — never off B-A-MCP alone.
