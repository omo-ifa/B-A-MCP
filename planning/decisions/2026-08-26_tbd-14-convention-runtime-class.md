# Decision — TBD-14 residual classification: the convention/runtime-discovered accepted class (E/F/G)

**Date:** 2026-08-26
**Gate:** `/decisions` (Gate 2) — a **classification ruling**, not a build and not a re-validation. No source code moves (accepted classes need no code — same as the TBD-16 §3.5 ABC ruling; they are what lets the follow-up re-validation classify residuals).
**Tool state at ruling:** `main` `4fee3ae`, `npm test` 107/107, `tsc` clean. **No code touched this trip.** `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.
**Inputs:** the TBD-14 design §3.3–§3.4 accepted-class list (`planning/designs/2026-08-25_directory-granularity-reachability-design.md`), the re-validation calibration record (`planning/calibration/2026-08-25_context-audit-tbd-14-revalidation.md`, PR #37), CLAUDE.md, SESSION_HANDOFF.md.

---

## The finding being ruled on

The TBD-14 re-validation confirmed the directory-granularity fix works (orphans 1 146 → 1 087, −59 rescued; zero "should-have-been-reached" failures) but **§3.4's categorical gate failed**: **162 of 1 087 residual orphans fit no named accepted class**, in three uniform shapes:

- **E — runtime-convention config (34):** `.claude/agents|rules|commands/*.md`, `WARP.md`, `cursor-hooks/*.md`, `.claude/projects/*/AGENT.md`.
- **F — per-component metadata (110):** cal.com `packages/app-store/*/DESCRIPTION.md`, one per plugin.
- **G — test-fixture markdown (18):** caveman `tests/caveman-compress/*.md`, Ghost `ghost/core/test/utils/fixtures/import/*.md` (+ zip/settings fixtures), and one doc `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md`.

Folding these into **genuine-abandoned** would score routing **style**, not rot — the exact failure `orphans` exists to reduce (the TBD-16 run #1 mechanism). So they route here.

---

## Ruling 1 — one unified accepted class for B + E + F

**Record a single accepted layout class: `convention/runtime-discovered (non-routed-by-design)`.** A document reached by a **machine convention** — a skill/agent runtime, a component registry, or a build/codegen step that discovers files by directory or naming convention — **not** by a router link, and therefore **not** the miss `orphans` exists to catch. The existing **convention-discovered (SKILL.md)** class (design §3.4, was named for superpowers' skill-support files) **folds into this class** — B, E, and F are one phenomenon at different conventions.

**Boundary = an ENUMERATED set of recognized conventions.** It grows **only by an explicit `/decisions` ruling**, never by a silent heuristic. This is what controls the silent-false-negative risk: the chain's tie-breaker is that a **visible false positive beats a silent false negative**, so the class may only absorb a residual when a *named, verified* convention is shown to reach it. A residual that merely *resembles* a convention is not absorbed.

**Enumerated conventions recognized as of this ruling:**

1. **Skill discovery** — files under a directory that carries a `SKILL.md`/manifest, loaded by a skill runtime by directory convention. *(was class B; superpowers skill-support, claude-mem skill dirs, cal.com `agents/skills/**`.)*
2. **Agent-runtime config** — files under an agent/tool runtime config directory (`.claude/agents/`, `.claude/rules/`, `.claude/commands/`, `.claude/hooks/`, `.claude/projects/`; the analogous `.cursor/`, `.windsurf/` trees), and root-level agent-runtime config files of the same kind (`WARP.md`, `.cursorrules`, `cursor-hooks/**`). *(posthog `.claude/**`, Ghost `.claude/commands/**`, superset `.claude/projects/**`, claude-mem `WARP.md` + `cursor-hooks/**`.)*
3. **Component-manifest content** — a per-component metadata/content file mandated by a component contribution convention or discovered by a registry/codegen glob (cal.com app-store `DESCRIPTION.md`, one per plugin, mandated by `packages/app-store/CONTRIBUTING.md` alongside `config.json`/`README.md`).
4. **Test-harness fixtures** — markdown test-data files a test or benchmark harness discovers by enumerating a fixture directory (caveman `tests/caveman-compress/**` globbed by `skills/caveman-compress/scripts/benchmark.py`; Ghost `ghost/core/test/utils/fixtures/import/**` resolved by `ghost/core/test/utils/fixture-utils.js`). **Recognition is by the harness that actually enumerates the directory — never by a bare `test/` path prefix** (see Ruling 2).

**Rejected alternative (recorded):** naming E and F (and G) as *separate* enumerated classes. Rejected because per-convention class-naming reopens TBD-14 on every new tool convention encountered in a future corpus; one class with an explicit, extensible convention list **converges** — a new convention is a one-line addition to the list under an explicit ruling, not a new class and not a re-opened loop.

---

## Ruling 2 — G (test-fixture markdown): investigated, then classified

Per the ratchet, **no path-based test-fixture class was pre-named** — a broad `test/`-path exclusion would silently swallow a genuinely-abandoned doc that happens to sit under `test/`. Each G residual was inspected for **how it is actually reached**:

- **Harness-globbed fixtures → class A (convention 4).** caveman `tests/caveman-compress/*.md` (+ `*.original.md`) are enumerated by `benchmark.py` (`parents[3]/"tests"/"caveman-compress"`). Ghost `fixtures/import/*.md` (the dated `deleted-/draft-/published-2014-12-19-*.md` sample posts), the zip-fixture `test.md`, and `fixtures/settings/notyaml.md` are resolved by `fixture-utils.js` and loaded by the importer/settings tests. **17 residuals** — machine-consumed test data, reached by a test-harness convention. Fold into the unified class.
- **Genuinely unreached doc → stays flagged (genuine-abandoned).** Ghost `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` is a **human-read testing guide** (documents MSW helper patterns), **not** enumerated by any harness. It is a real doc unreachable from any router — correctly flagged. **1 residual.** It stays a `genuine-abandoned` finding.
- **Neither / scoped exclusion warranted → ratchet.** None. Every G residual fell into one of the two cases above, so **no new exclusion is created** this trip.

`MSW_USAGE_GUIDE.md` is the proof of Ruling 2's caution: a blanket `test/`-path exclusion would have swallowed it, converting a correct visible finding into a silent miss. Recognition stays by *convention mechanism*, not by *path prefix*.

---

## Out of scope this trip — MECHANISM

**Whether recognized conventions are later modeled as reachability edges or as a named exclusion is a downstream design, not this ruling** — exactly as TBD-14 first decided directory-routed docs *should be* reached before deciding *how*. This ruling is at the **taxonomy** level: it names the accepted class and the conventions that populate it, so the follow-up categorical re-validation can classify residuals **by hand** (as TBD-16's §3.5 classes are applied). It authorizes **no** detector, glob, or exclusion in code.

Also out of scope: any threshold or weight number. **TBD-10/11/12 stay deferred**; `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.

---

## Effect on the 162 (for the record — counting, not the gate)

| shape | count | disposition |
|---|--:|---|
| E runtime-convention | 34 | → convention/runtime-discovered (conventions 2) |
| F per-component metadata | 110 | → convention/runtime-discovered (convention 3) |
| G harness fixtures | 17 | → convention/runtime-discovered (convention 4) |
| G doc (`MSW_USAGE_GUIDE.md`) | 1 | → genuine-abandoned (stays flagged) |

With the pre-existing B (SKILL, 20) folded in, the unified class accounts for **181** residuals across the corpus; `genuine-abandoned` gains the 1 test-dir doc. No residual now fits *no* class — but this is a **paper** re-classification; TBD-14 closes only when a **run** re-validation applies these classes on the pinned corpus (its own later session).

---

## Status after this ruling

- **TBD-14 stays OPEN.** Its close condition is updated: a follow-up **categorical re-validation** on the pinned nine-repo corpus in which every residual classifies as `genuine-abandoned`, `route-to-directory (nested)`, `dated-archival`, or **`convention/runtime-discovered`** (this ruling's class). A residual reached by a convention **not** on the enumerated list returns **here** (the ratchet), never a silent pass.
- `orphans` stays **out of TBD-10 weighting** until that re-validation passes. `coverage` remains the sole load-bearing headline routing-layer sub-score until TBD-14 re-validates and TBD-11 (bloat shape) lands.
- **No new TBD** opened; **no** number set; **no** code changed.

## Ratchet note

If the follow-up re-validation surfaces a residual reached by a convention not enumerated above, it returns to `/decisions` to extend the list (one line, explicit ruling) before the run can pass — it does not get folded in silently.
