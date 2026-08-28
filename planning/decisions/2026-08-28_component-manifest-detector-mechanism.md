# Decision — component-manifest orphan detector: the mechanism (§4-gap, convention #3)

**Date:** 2026-08-28
**Gate:** `/decisions` (Gate 2) — a **mechanism** ruling. TBD-14 ruled the *taxonomy* (component-manifest is an accepted `convention/runtime-discovered` class) and explicitly "authorizes no detector, glob, or exclusion in code"; TBD-18 design §4 and SESSION_HANDOFF route the *how* here. This record resolves the how; it does not itself write code.
**Feeds:** TBD-10 (the provisional `orphans:1` → final raise, gated on all three §4-gap items landing + a corpus re-validation).
**Inputs:** `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md` (taxonomy, convention #3 + Ruling 2 caution), `planning/decisions/2026-08-26_tbd-10-orphans-weight.md` (why the weight is provisional), `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` §4 (the §4-gap), `src/tools/context-audit/accepted-layout.ts` (existing detectors D1–D4).

---

## What this loop builds

**One** detector — **detector D5**, component-manifest — added to `accepted-layout.ts` alongside D1 (route-to-dir-nested), D2 (skill-discovery), D3 (agent-runtime config), D4 (dated/versioned archival). It nets the cal.com app-store `DESCRIPTION.md` residual class (F, 110 residuals) that TBD-14 classified **by hand** but no code yet excludes — the un-mechanized bias that keeps `orphans:1` provisional.

## The core tension (why this needed a gate, not a bounded edit)

`context_audit` reads **no source code**. TBD-14 Ruling 2 forbids recognizing this class by a bare path prefix (e.g. `test/`, `docs/`, or the literal cal.com path) — the tie-breaker is **a visible false positive beats a silent false negative**, and a path-prefix rule silently swallows a genuinely-abandoned doc that happens to sit under the prefix (the `MSW_USAGE_GUIDE.md` casualty). So the detector must key on a **structural artifact of the registry mechanism** that is visible in the file tree without reading source.

## Ledger (rows re-keyed **L1–L13** to avoid collision with detector ids D1–D5)

| Row | Decision | Resolution |
|-----|----------|------------|
| **L1** | Which §4-gap classes this loop | Component-manifest (convention #3) **only**. |
| **L2** | Recognition basis | **Registry shape**: a `DESCRIPTION.md` is netted only when its parent is one of **several sibling directories that each carry the same manifest set**. Not a lone sibling; not a path prefix. The repeating manifest set is the visible artifact of a registry glob. |
| **L3** | "Manifest set" definition | A directory qualifies iff it contains **both** `config.json` **and** `DESCRIPTION.md`. |
| **L4** | Which doc is netted | **Only** the `DESCRIPTION.md` in a qualifying dir. A lone human `DESCRIPTION.md` with no `config.json` sibling — or no repeating sibling dirs — stays counted (visible FP, the safe direction). |
| **L5** | **"Several" threshold** | **≥ 3** sibling directories (under the same parent) must each carry the manifest set. Owner-ratified 2026-08-28. Rationale: (1) a rule-7 number under uncertainty errs toward the **visible-FP** direction per the tie-breaker — ≥2 errs silent-FN (a coincidental pair nets a human doc), ≥3 errs visible-FP (a two-entry registry stays counted, still a finding); (2) L2 says "several" — two is a pair, three is the smallest count proving a **repeating** registry pattern rather than coincidence; (3) **zero corpus cost** — cal.com app-store has dozens of entries, all 110 net either way, and no pinned repo has a 2-entry registry. **Raise-eligible to ≥2 only by explicit future ruling** (same ratchet as L6). |
| **L6** | Marker file identity | Literally `config.json` — **not** any `config.*` / `manifest.*` / `plugin.json`. Widening the marker set raises silent-FN risk; it grows **only by explicit future ruling** (mirrors TBD-14's enumerated-set-grows-by-ruling philosophy). |
| **L7** | Case sensitivity | Case-insensitive basename match for `config.json` and `DESCRIPTION.md` (consistent with the existing `SKILL.md` handling in D2). |
| **L8** | Netting semantics | Excluded from the `orphans` **numerator**; the doc **stays a candidate and a finding** — identical to detectors D1–D4 (`isAcceptedLayout` in `accepted-layout.ts`). |
| **L9** | Does this raise `orphans:1`? | **No.** TBD-10's provisional→final raise is gated on **all three** §4-gap items (component-manifest, test-fixture, bare-`docs/**`). This mechanizes one; the weight stays **1**. |
| **L10** | Close condition | The build alone does not close anything. Correctness is confirmed only by a **categorical re-validation on the pinned nine-repo corpus** (must net the 110 cal.com residuals AND net **zero** genuine-abandoned docs). This folds into TBD-10's pending corpus re-validation. |
| **L11** | Rule 2 / Rule 8 | No `tools/list` schema field added → the context-budget **ledger is unchanged** (rule 2). `src/API.md` `orphans`/`stats` prose updated only if wording shifts (rule 8) — verified at build. |
| **L12** | Test-harness-fixture mechanization | **Deferred → TBD-25.** No source-free tight mechanism exists today (the tool cannot see that a harness globs a fixture dir); the only available loose rule (harness-config-in-an-ancestor) is a path-prefix in disguise that silently swallows `MSW_USAGE_GUIDE.md`. Per the tie-breaker, **no rule beats a loose rule** — the class stays **counted** (visible FP) until a tight mechanism appears. |
| **L13** | Bare-`docs/**` disposition | **Deferred → TBD-26.** The third §4-gap item; not addressed this loop. |

## Detector D5 — predicate (for the design doc to formalize)

A markdown doc `p` is component-manifest (netted) iff **all** hold:

1. `basename(p)` is `description.md` (case-insensitive).
2. `p`'s parent directory `P` contains a `config.json` (case-insensitive) sibling file.
3. `P` has a parent `G` (i.e., `P` is not the repo root), and **≥ 3** of `G`'s immediate child directories each contain **both** a `config.json` and a `description.md` (case-insensitive) — `P` itself counts toward the 3.

Pure and structural over the already-walked file list; no source read, no network, no path-prefix. The exact interface (does it precompute the qualifying-parent set once, like `computeSkillDirs`, or test per-doc) is a `/design-doc` concern.

## Out of scope (recorded)

- Test-harness fixtures (→ TBD-25) and bare-`docs/**` (→ TBD-26).
- Any weight/threshold **number** other than L5's ≥3. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.
- The corpus re-validation run itself (its own later session, under TBD-10).

## Ratchet note

If the corpus re-validation surfaces a `DESCRIPTION.md` residual reached by a registry that uses a different marker filename, or a genuine-abandoned doc silently netted by D5, it returns **here** to adjust L5/L6 by explicit ruling — never a silent heuristic widening.
