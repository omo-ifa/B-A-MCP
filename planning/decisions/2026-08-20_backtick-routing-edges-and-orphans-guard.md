# Decision — backtick routing edges (v1 parser fix), orphans zero-routing-basis guard, and the zero-edge ruling

**Date:** 2026-08-20
**Status:** Resolved
**Decider:** B&A (product owner)
**Relates to:** the routing census (`planning/calibration/2026-08-20_provenance-and-routing-census.md`), which found **0 of 5** real repos route via markdown links — all use backtick code-span paths, exactly like B-A-MCP.
**Amends:** `planning/decisions/2026-08-20_subscore-confidence-signal.md` for the **zero-edge case** (see "Amendment" below) so there is one ruling, not two documents that disagree.

---

> **Amended 2026-08-24** — `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.1. §62.1's doc-relative-OR-root-relative resolution gains a third outcome between "resolves" and "drift": an unanchored reference, in NESTED routers only, which is neither an edge nor a finding.

## Context

`context_audit`'s `extractLinks` recognized only `[text](target)` markdown links as routing edges. The census proved the dominant real-world convention is backtick code-span paths (`` `src/CONTEXT.md` ``), which produced **zero** routing edges. Two harms followed, confirmed empirically:

1. **`routing_drift`** reported "not assessed" (`n=0`) on every backtick-routed repo — the top-weighted accuracy sub-score never fired in the wild.
2. **`orphans`** and **`coverage`** fired **confident false positives**: superpowers scored **61 phantom orphans** and **coverage 0** purely because the router's edges were unparsed, so reachability saw nothing routed. The `n`-signal did not protect them — their populations were non-empty (61 candidate docs, 1 dir), so the bug hid behind a healthy-looking denominator, yielding a **fabricated** headline (24), not a low one.

Per the census brief this is a **v1 correctness finding**, not a v1.1 note.

## Decision

### 1. Backtick code-span paths are routing edges — resolve-only

`extractLinks` now also emits **backtick** code-span candidates, tagged `source: "backtick"`. A span is a candidate only if it is **path-shaped** (no internal whitespace; contains `/` or ends `.md`) — so `` `AuditResult` ``, `` `npm test` ``, `` `foo()` `` are excluded. A backtick candidate becomes a routing edge **only if it resolves to an existing in-repo path** ("resolve-only"). A non-resolving backtick span is treated as **prose** — it never produces a `broken_ref`, `routing_drift`, `malformed_link`, or `escapes_root` finding. This deliberately keeps false positives out: a router that backtick-routes to real files gets a real `routing_drift`/`coverage`/`orphans` assessment; illustrative or prose backticks are ignored.

Markdown links are unchanged (still flag `broken_ref`/`routing_drift` when missing). Resolving edges of **either** source now feed `routedDirs`, reachability, and the resolving-edge counts.

### 2. Orphans zero-routing-basis guard (orphans ONLY)

`orphans` means "in-scope doc unreachable from a routing root." When the routing layer resolves **zero edges from any root** (`resolvedRefsFromRoots === 0`), reachability is vacuous — every doc looks unreachable — so orphan enumeration is **skipped entirely** (`n=0 → null`, "not assessed"), rather than fabricating a wave of false orphans. `routedDirs` may still be non-empty via **non-root** cross-links (this is exactly how superpowers reached 61 phantom orphans); the guard closes that trap by keying on *root* resolving edges, not on `routedDirs`.

The guard has **no root-method condition** — a `git_root`/`given_path` audit with zero resolving root edges is in the same state and nulls the same way. The invariant: **no routing-graph-derived orphan number is reported when the routing graph has no root edges.**

### 3. Coverage is NOT guarded — it keeps its floor-to-0

`coverage` keeps its documented behavior: it **floors to 0 as a real assessed result** when routing covers no significant directory, including the no-CLAUDE.md case. The guard is **orphans-only**. Rationale (product owner): coverage=0 is the correct, wanted answer for a monolithic repo that inlines everything and routes nowhere — a repo type the tool must **catch, not go quiet on**. Orphans differs: zero root edges makes *every* doc an orphan (unbounded noise), so nulling is strictly right there. After the parser fix, `resolvedRefsFromRoots === 0` almost always means the repo genuinely routes nothing (it would have to fail both link syntaxes in every router at once), where coverage=0 is honest signal, not an artifact.

### 4. `routing_unresolved` info finding

When routers are present but **zero references resolve** (`routing_files > 0 && resolvedRefsFromRoots === 0`), emit one **info** finding: *"routing files are present but none of their references resolve to an existing path."* This makes a possible **third routing syntax** (one this parser still doesn't read) visible on every run, instead of letting it read as a confident score.

### 5. Headline requires a routing-layer measurement

The headline routing-**health** composite must rest on at least one real routing-layer sub-score — `routing_drift`, `coverage`, or `orphans`. If all three are `null` (no routing root, or routers that resolve nothing), the only survivors are hygiene sub-scores (`broken_refs`, `bloat`); scoring those alone would report a confident "health" number for a repo whose routing was never assessed. The headline is `null` in that case; the `root_absent` / `routing_unresolved` findings carry the brokenness. A `coverage` floor of `0` **is** a routing measurement, so it keeps the headline (a monolithic repo still scores as broken, not "not assessed"). *(Verifies census Condition 1: a repo with no CLAUDE.md and no CONTEXT.md no longer scores ~100 off `broken_ref` alone. The `root_absent` path emits the critical finding but does not gate the score — the score fix belongs in `headlineScore`, the composite formation, which is where it now lives.)*

## Amendment to `2026-08-20_subscore-confidence-signal.md` (the zero-edge case)

That record established: `n=0` → `null`; and coverage still **floors to 0** as a real assessed result (only `n=0` → null). This record **refines the zero-edge case** so the two agree:

- **Orphans** now has a **second** null trigger beyond `n=0`: the routing-basis guard nulls orphans when `resolvedRefsFromRoots === 0` **even if** `orphanCandidateTotal` would be > 0 (populated by non-root cross-links). This extends the earlier "empty population → null" principle from *empty candidate set* to *empty routing basis*.
- **Coverage** is **unchanged** by this record — it keeps its floor-to-0. There is no coverage guard. The apparent tension ("zero edges → null" vs "coverage floors to 0") is resolved in favor of **orphans-null, coverage-floors-to-0**.
- **The headline** gains the routing-layer-measurement requirement (§5), which supersedes any reading of the earlier record that a headline could be formed from hygiene sub-scores alone.

A pointer to this record is added to the head of `2026-08-20_subscore-confidence-signal.md`.

## Consequences

- `FindingCategory` gains `routing_unresolved` (info). `src/API.md` updates in the same commit (rule 8) — new category, backtick-edge semantics, orphans guard, headline condition. Standing tool-definition cost re-measured (rule 2): unchanged (no input/output schema or description change; findings are generic objects in the schema).

### Refinements from code review (same branch)

1. **Backtick paths resolve root-relative too.** Markdown links are doc-relative by spec, but backtick code-span paths are written **root-relative** in the wild (this repo's `src/CONTEXT.md` writes `` `src/API.md` ``). A backtick span is now an edge if it resolves **doc-relative OR root-relative** (counted once, doc-relative preferred). Without this, nested routers' root-relative paths dropped and re-created false orphans.
2. **No `` [`path`](path) `` double-count.** That GitHub idiom matched both scanners; the backtick twin (the link's own label) is now suppressed, so one logical link counts once — it was otherwise skewing `routing_drift`/`broken_refs` denominators and `n`.
3. **Backtick edges are recognized only from router docs (`isRoot`).** In a non-root content doc a backtick path is a prose citation, not a link; counting it inflated `broken_refs`' denominator with citations (B-A-MCP: `n` 62 → 444 before this scoping). Non-root docs still link via markdown, as before.

- Real-repo effect (sanity runs, pre-calibration): superpowers `routing_drift` `null → 100/n3`, `coverage` `0 → 100/n1`, `orphans` now a **real** assessment (`0/n61`, no longer a phantom — the router resolves 3 edges, so the guard is correctly off), headline `24 → 63`. B-A-MCP `routing_drift` `null → 100/n65`, `coverage` `50/n2 → 100/n2` (nested router paths now resolve), headline `62`; its low `broken_refs` (`4/n23`) is the TBD-13 plan-doc example-link issue, now surfaced honestly rather than masked. The confident-false-positive artifact is gone.
- New `broken_ref` findings from **example links in prose/teaching docs** are **not** addressed here — that is **TBD-13** (signal quality), deliberately left open.
- No threshold (TBD-10/11/12) resolved or touched. Rule 7 stands. The first post-fix calibration run is **not** the README sample.

## Non-goals

- Does not change orphan semantics for repos whose skills are tool-discovered rather than markdown-routed (superpowers now shows 84 real orphans against 3 parsed root edges) — a possible future refinement, not this fix.
- Does not parse fenced code blocks specially, nor treat non-`.md` bare filenames without a slash as edges — a conservative candidate filter, revisitable if calibration shows misses.
