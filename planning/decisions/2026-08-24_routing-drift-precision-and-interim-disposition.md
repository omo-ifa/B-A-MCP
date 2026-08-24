# Decision — `routing_drift` is a PRECISION + DISPLAY problem: correctness-null in the headline, interim `info` on the findings

**Date:** 2026-08-24
**Status:** Resolved (policy + shape; **implementation deferred to a separate build loop**; no numbers)
**Decider:** B&A (product owner)
**TBD:** TBD-16 (opened 2026-08-24 by calibration run-6)
**Evidence:** `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §3
**Forks:** `planning/decisions/2026-08-20_router-path-drift.md` (the strict path-shape definition) and `planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md` §62.1 (doc-relative OR root-relative resolution)

---

## Why

Run-6 is the first run in which `routing_drift` fires at volume — posthog `n431`, caveman `n385`, after the `AGENTS.md` fix made the real routers visible. All **59** drift findings across the four repos that produce any were checked against the filesystem:

| bucket | count | what it is |
|---|:--:|---|
| **prose-relative** | **26** | the target **exists**, one directory deeper than where the tool looked |
| **placeholder token** | **10** | `<chart_id>`, `<dir>`, `foo` — template text, never a path |
| plausibly genuine | **~10** | real broken routes |
| **precision** | **≈ 17 %** | ~49 of 59 flags are wrong |

### The mechanism — a base-directory over-read

`2026-08-20_backtick-routing-edges-and-orphans-guard.md` §62.1 established that a backtick span resolves **doc-relative OR root-relative**. `2026-08-20_router-path-drift.md` then made a path-shaped `.md` span in a router that resolves under **neither** base into scored drift.

Run-6 shows the failure that combination produces: **router prose routinely describes a directory other than the router's own.** posthog's `products/signals/skills/AGENTS.md` documents each scout subdirectory in turn and says *"the generalist keeps one progressively-disclosed reference, `references/conventions.md`"*. Both bases miss; the file **exists** at `products/signals/skills/signals-scout-general/references/conventions.md` — a **third** base, the directory the prose is currently discussing. Verified on disk:

```
EXISTS   signals-scout-general/references/conventions.md
EXISTS   signals-scout-web-vitals/references/remediation.md
```

Three named sub-classes, all the same root cause:

1. **Prose-relative** (26, dominant) — the base is the directory under discussion, not the router's.
2. **Install-target** (caveman) — router prose describing where files land in the **consumer's** repo: `.windsurf/rules/caveman.md`, `.clinerules/caveman.md`, `.github/copilot-instructions.md`, `.claude/skills/caveman-learn/SKILL.md`. Not routes in caveman at all.
3. **Bare-literal** — a bare `.md` with no path (posthog `products/stamphog/AGENTS.md:53`, caveman ×3). The original caveman-28 artifact.

### Markdown-link drift has still never fired on a real defect

Run-6 produced the first-ever md-link drift hits in six runs — **2**, on posthog — and **both are template placeholders**:

```
.../inbox/AGENTS.md:111              -> .../inbox/chart:<chart_id>
.../report_generation/AGENTS.md:62   -> .../report_generation/chart:<id>
```

Across nine repos and six runs, broken markdown links in routers have produced **zero** genuine findings.

## Decisions

### D1 — TBD-16 is scoped as PRECISION + DISPLAY, not a weighting question

The instinct was to park this under TBD-10 and neutralise it with a weight. That is wrong: **at zero weight the ~49 incorrect flags still render.** A user reading an audit sees five wrong high-severity accusations for every right one regardless of what the composite does with the number. The tool's whole claim is an *unfakeable diagnosis*; a sub-score cannot be quarantined from the headline and left intact in the output. Precision is therefore a first-class correctness item in its own right, **not** a threshold item deferred behind TBD-10.

### D2 — `routing_drift` contributes **null** to the headline: a CORRECTNESS-driven null, not a data null

Until the precision fix lands **and is re-validated**, `routing_drift` reports `null` ("not assessed") rather than a number.

- **Explicitly a correctness null, not a data null.** Every other `null` in this tool means "the population was empty" (`n=0`) or "the routing basis was empty". This one means **"the measurement is not trusted."** The distinction is load-bearing for the next reader: this null is **not** resolved by assigning a weight later. It holds until the base-dir precision fix lands and is re-validated against the nine-repo corpus.
- **Reuse the existing machinery untouched.** The null-drop, weight renormalisation, and the §5 headline guard in `2026-08-20_backtick-routing-edges-and-orphans-guard.md` already handle a null sub-score correctly. **No weight-0 path is invented**, and `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` (`src/tools/context-audit/score.ts`) are not edited.
- **Why a weight of 0 was rejected.** `ROUTING_LAYER_KEYS` is separate from `TBD_10_WEIGHTS`, so a zero-weighted drift still satisfies the §5 "headline rests on a routing-layer measurement" guard while contributing nothing — leaving `bloat`, the sole hygiene sub-score, to carry the headline alone. That is precisely the fabricated-hygiene-only headline §5 exists to prevent. Measured on run-6's icm-architect (`bloat 90/n2`, `drift 0/n2`, coverage + orphans already null):

  ```
  today       (0×3 + 90×1) / (3+1) = 22.5  ->  headline 23
  weight 0    (0×0 + 90×1) / (0+1) = 90    ->  headline 90   <- REJECTED
  null        routing-layer all null       ->  headline null <- ADOPTED
  ```

  A repo whose routers resolve nothing, carrying two broken template routes, must not score 90. `null` is the honest result.
- **Scope:** the null governs the **headline contribution only**. The findings themselves still render, per D3.

### D3 — `routing_path_missing` is demoted to `info` — **interim and reversible**

Precedent is TBD-13's identical move for `broken_ref` (`2026-08-20_tbd-13-broken-refs-router-docs-only.md`): still reported, unscored, visibly lower-confidence.

- **The ~10 genuine catches stay visible**; the ~49 stop reading as high-severity defects.
- **Suppressing the category entirely was rejected.** Going silent would abandon the ~10 real broken routes and recreate the pre-2026-08-20 state — a check *structurally incapable of firing* — which `2026-08-20_router-path-drift.md` deliberately ended.
- **`info` is NOT its permanent home.** **Restore trigger: on the precision fix landing and being re-validated, `routing_path_missing` returns to `high`.** That trigger is recorded in the TBD-16 row of `src/TDD.md` so it cannot quietly become permanent.
- **Self-documenting:** the ≈17 % precision measurement is carried in the run-6 record so an `info`-level flag can be traced to why it is `info`.

D2 and D3 are **paired and revert together** on the same fix: headline contribution `null`, findings at `info`.

### D4 — caveman-28 is absorbed into TBD-16

The "caveman-28 drift residue" ceases to exist as a standalone open item. **posthog reproduces every sub-class independently**, so it was never caveman-specific — it satisfies the do-not-fix-on-one-repo rule that `2026-08-20_router-path-drift.md` §39 attached to the residue. The three sub-classes above replace "28 mixed findings on one repo" as the characterisation.

### D5 — the fix is authorised as a SEPARATE build loop

Two items, neither designed nor coded here:

1. **The base-dir over-read** — what qualifies as a route when a path resolves under no base the tool can know. Per task-observer observation #10 and the precedent in `2026-08-20_router-path-drift.md` §18–25, treat this as a **definition** problem — tighten what counts as a route and write it **as the definition** — not as a noise filter bolted on top. Note that "add the described directory as a third base" is *not* obviously the answer: it requires reading prose semantics, and a permissive third base risks accidental matches and a new false-negative class.
2. **Md-link drift disposition** — whether a check that has produced 0 genuine findings in nine repos over six runs should keep its current severity, be demoted, or be scoped.

Route: `/design-doc` → TDD build on a branch + PR under `superpowers:test-driven-development` with the code reviewers, never direct to `main`.

## Consequences

- **TBD-10 stays blocked**, and now for a reason that is not a missing number: a sub-score at ≈17 % precision cannot be weighted. Weighting it would repeat the error class of the rejected `6000` (tuning a rubric to an instrument artifact).
- `routing_drift` reporting `null` is an **output-contract-visible change**; `src/API.md` updates in the **same commit as that code change** (rule 8), not in this docs pass.
- The severity change to `routing_path_missing` touches `SEVERITY_BY_CATEGORY`, also in that later commit.
- **caveman's influence stays visible:** it is one of the two drift-residue repos *and* the top-end router-count case in TBD-11 — recorded, never silently baked in.

## Non-goals

- **No number set.** TBD-10/11/12 untouched. A correctness-driven `null` and a severity demotion are not thresholds.
- No code, no design content. No change to the strict path-shape definition, to non-router backtick handling, or to `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS`.
- Does not decide the md-link-drift disposition — that is authorised to a loop, not resolved here.
