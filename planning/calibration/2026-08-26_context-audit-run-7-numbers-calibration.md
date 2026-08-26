# context_audit — calibration run 7 (the numbers run, all four sub-scores shape-clean)

**Date:** 2026-08-26
**Tool state:** `main` at `a6e5ce1` (TBD-16 precision + shape-exclusions merged #26/#30; TBD-14 directory-granularity reachability merged #35; TBD-11 bloat worst-case aggregation merged #41). `npm test` **112/112**, `tsc --noEmit` clean, verified on `main` before the run. **Node v25.2.1.** Token method `char-approx-v1`. `calibrated: false` (stubs still active — this run is the input to setting them, not their setter).
**Corpus:** the pinned nine-repo corpus under `~/dev/ba-calibration/`, at the exact run-6 commits (verified this session; see §0). **B-A-MCP was NOT audited** — its backtick routing gives degenerate denominators and it is not a neutral baseline (rule reaffirmed every run).
**Harness:** `runContextAudit({ path })` read-only against each clone, plus the tool's own `walk`/`buildGraph`/`countTokens` primitives to dump the raw bloat distribution. The dumped distribution re-derives every repo's `bloat` sub-score exactly (`bloatMatch: true` on all nine) — the raw numbers below are faithful to the shipped scorer, not a re-implementation that could drift.

> **Why run 7 exists.** Runs 1–6 each measured the tool at a *different* commit, and three of the four sub-scores changed shape after run-6: `bloat` (TBD-11 worst-case, #41, landed **today**), `orphans` (TBD-14 dir-granularity, #35), `routing_drift` (TBD-16 precision, #26/#30). No prior run holds **all four sub-scores at one shape-clean commit** — which is exactly what TBD-10 weighting needs. run-7 is that consolidated snapshot. It is **not** the README sample (still gated) and **not** a corpus refresh (commits are pinned, §0).
>
> **Outcome in one line.** The TBD-11 shape fix is **confirmed in the wild** for the first time (count-domination gone: caveman `0/n40 → 80`, posthog `0/n45 → 55`). `bloat` and `coverage` discriminate cleanly and their cutoffs are now assessable. But the consolidated view surfaces **two weighting blockers for TBD-10** that no single-sub-score run could show: `routing_drift` is **saturated at ~100** across the corpus (post-precision-fix it is high-precision, near-zero-variance), and the `orphans` raw sub-score is **dominated by TBD-14 accepted-layout classes** (only 20 of 1 077 orphans are genuine-abandoned), so a low `orphans` score measures repo *layout style*, not routing health. Weighting either as-is would repeat the run-6 error class (weighting a signal that is not measuring what the weight assumes). **No number is set in this file — dispositions route to `/decisions` (Gate 2).**

---

## 0. Pinned corpus — no re-clone, one variable changed (the tool)

Same nine clones as runs 4–6, verified at the run-6 commits this session (all working trees clean):

| Repo | HEAD | Repo | HEAD |
|---|---|---|---|
| superset | `18fc2c6` | superpowers | `b36e082` |
| posthog | `7bd2689` | caveman | `a42ef76` |
| cal.com | `176037d` | claude-mem | `e2d1df5` |
| Ghost | `0cd3280` | one-skill-to-rule-them-all | `281f134` |
| | | icm-architect | `b20fb45` |

Pinning holds the corpus fixed so every delta from run-6 is attributable to the **tool** (the three shape fixes), not upstream churn. A neutral-external / refreshed corpus is a separate, later question — see §6.

---

## 1. The consolidated table — all four sub-scores at one shape-clean commit

| repo | headline | bloat | orphans | routing_drift | coverage | routers | routing_tokens |
|---|:--:|:--:|:--:|:--:|:--:|:--:|--:|
| **superset** | 66 | 80/n2 | 1/n113 | 100/n26 | 73/n411 | 2 | 10 164 |
| **posthog** | 69 | 55/n45 | 11/n678 | 100/n406 | 87/n1819 | 45 | 155 280 |
| **cal.com** | 60 | 60/n4 | 22/n218 | 100/n17 | 36/n240 | 4 | 17 737 |
| **Ghost** | 88 | 100/n7 | 72/n36 | 100/n34 | 79/n349 | 7 | 3 510 |
| **superpowers** | 66 | 100/n1 | 0/n61 | 75/n4 | 100/n1 | 1 | 2 211 |
| **caveman** | 77 | 80/n40 | 35/n91 | 97/n368 | 89/n35 | 40 | 66 057 |
| **claude-mem** | 50 | 100/n1 | 0/n61 | 100/n1 | 0/n50 | 1 | 262 |
| **one-skill** | null | null/n0 | null/n0 | null/n0 | null/n0 | 0 | 0 |
| **icm-architect** | 25 | 100/n2 | null/n0 | 0/n1 | null/n0 | 2 | 446 |

Finding-category counts (run-7): superset `{orphan:112, escapes_root:53, broken_ref:20, bloat:3}` · posthog `{orphan:604, broken_ref:73, escapes_root:33, bloat:20, routing_path_missing:2, malformed_link:2, symlink:1}` · cal.com `{orphan:170, broken_ref:32, escapes_root:2, symlink:2, bloat:2}` · Ghost `{symlink:17, orphan:10, escapes_root:1, malformed_link:1}` · superpowers `{orphan:61, broken_ref:24, routing_path_missing:1}` · caveman `{orphan:59, routing_path_missing:12, bloat:6}` · claude-mem `{broken_ref:160, orphan:61, escapes_root:5, symlink:2}` · icm `{root_absent:1, routing_path_missing:1, routing_unresolved:1}` · one-skill `{root_absent:1}`.

---

## 2. TBD-11 — the shape fix is confirmed in the wild, and the cutoffs are now assessable

### 2.1 The worst-case aggregation works on real repos (first corpus validation of #41)

`bloat` was reworked to worst-case-over-chain **today** (#41) and merged with unit-test proof only. run-7 is its first run against real repositories. The count-domination defect run-6 recorded is **gone**:

| repo | routers | run-6 bloat | **run-7 bloat** |
|---|:--:|:--:|:--:|
| caveman | 40 | **0**/n40 | **80**/n40 |
| posthog | 45 | **0**/n45 | **55**/n45 |
| cal.com | 4 | 10/n4 | 60/n4 |
| superset | 2 | 45/n2 | 80/n2 |
| Ghost | 7 | 60/n7 | 100/n7 |
| superpowers | 1 | 90/n1 | 100/n1 |
| claude-mem | 1 | 90/n1 | 100/n1 |
| icm | 2 | 90/n2 | 100/n2 |

caveman (40 routers, mean ~1 651 tokens each) no longer floors to 0 — its score is now driven by its heaviest single router (7 283 tokens), not its router *count*. **caveman is the mid-chain-giant case in the wild:** its worst chain sums 7 437 tokens (chain-token term = 5) but its 7 283-token lone router produces a larger router term (20), and `max(5, 20) = 20` carries the penalty. This is exactly the case `per-chain-only` was rejected for being silent on. The `inline_ratio` drop also lifted the reference-quality routers to their ceiling (superpowers, claude-mem → 100). The shape ruling holds against real data.

### 2.2 The raw distribution behind the cutoffs

Pooled per-router token distribution across all 102 routers in the sample: p50 **1 127**, p75 **3 040**, p85 **4 053**, p90 **5 746**, p95 **9 834**, p98 **15 125**, max **22 196**. Count over each candidate cutoff: `>3000: 26` · `>4000: 16` · `>5000: 13` · `>6000: 10`.

Worst root→leaf chain per repo (token sum, depth):

| repo | worst-chain tokens | depth | heaviest single router |
|---|--:|:--:|--:|
| claude-mem | 262 | 1 | 262 |
| icm-architect | 275 | 1 | 275 |
| Ghost | 1 264 | 2 | 977 |
| superpowers | 2 211 | 1 | 2 211 |
| caveman | 7 437 | 2 | 7 283 |
| superset | 10 164 | 2 | 6 195 |
| cal.com | 15 125 | 1 | 15 125 |
| posthog | 31 427 | **5** | 22 196 |

**Ground-truth anchors** (carried from prior runs, re-confirmed here): the healthy/reference router is superpowers' **2 211**-token single `CLAUDE.md`; the opposite-of-bloat floor is claude-mem's **262**; genuine top-end bloat is posthog's 8 000–22 196-token routers and cal.com's **15 125**-token `agents/skills/vercel-react-best-practices/AGENTS.md`.

### 2.3 What the three cutoffs can and cannot be set to

- **`ROUTER_TOKEN_CUTOFF = 3000`** — sits at ~p75. Because the sub-score is worst-case, **only each repo's heaviest router touches the score**, and no repo's heaviest router lands in the contested 3 000–4 000 band (they are 262 / 275 / 977 / 2 211 / 6 195 / 7 283 / 15 125 / 22 196). So **3000 vs 4000 changes no repo's `bloat` score in this sample** — it only changes finding *volume* (26 breaching routers at 3000 → 16 at 4000). Per the house tie-breaker (visible FP > silent FN), the low cutoff is the safe error direction for findings. The reference router (2 211) is safely below 3000; genuine bloat is far above. **Data-supported to keep 3000, now as a decision rather than a guess.** Raising to 4000 is defensible on finding-noise grounds and score-neutral — a `/decisions` call, not a data mandate.
- **`CHAIN_TOKEN_CUTOFF = 6000`** — the worst-chain distribution has a clean natural gap: **2 211 → [gap] → 7 437**. 6000 falls inside it (superpowers/Ghost under; caveman/superset/cal.com/posthog over). **Data-supported at 6000.** (Anywhere ~2 500–7 000 separates the same repos; 6000 is a defensible mid-gap value.)
- **`CHAIN_DEPTH_CUTOFF = 4`** — **under-determined.** Only posthog exceeds it, at depth **5**; every other repo is depth 1–2. There are **zero observations at depth 3 or 4**, so the corpus cannot distinguish a cutoff of 3, 4, or 5 — they all fire on exactly posthog and nothing else. The value is safe (depth-5 routing is plausibly "deep") but the corpus does **not** constrain it. **Recommend keep 4, flagged as thin — the one cutoff run-7 does not truly calibrate.**

---

## 3. TBD-12 — `MIN_FILES`: no new data, the same sharp question

`coverage.ts` is **unchanged** since run-6, so run-7 reproduces run-6 exactly. Significant-directory counts at `MIN_FILES = 5`: `one-skill/icm 0 · superpowers 1 · caveman 35 · claude-mem 50 · cal.com 240 · Ghost 349 · superset 411 · posthog 1 819`.

The decisive datapoint is unchanged and re-confirmed: **superpowers scores `coverage 100` off a single significant directory — and it is a *test* dir** (`tests/brainstorm-server`, the only dir with ≥5 source files). A headline-grade 100 resting on `n = 1` (a test dir) is the standing argument that either `MIN_FILES = 5` is too low or the significance basis must weight source above test dirs. **run-7 adds no new coverage evidence** (same code, same corpus) — so TBD-12 is a **policy call on existing data**, not a data-blocked item any more. It routes to `/decisions` as resolve-or-defer; the tie-breaker cuts against silently raising `MIN_FILES` (a genuine 4-source-file uncovered dir would drop out of scope = silent FN), which is why this is a decision, not an obvious bump.

---

## 4. TBD-10 — the consolidated view surfaces two weighting blockers

Current stub weights (`src/tools/context-audit/score.ts`, read from source): `routing_drift: 3, orphans: 2, coverage: 2, bloat: 1`. Principle already resolved: accuracy cluster weighted above bloat; a `null` sub-score drops and the rest renormalize. run-7 is the first time all four fire at one shape — and it shows two of the four are **not cleanly weightable as they currently score**:

### 4.1 Blocker A — `routing_drift` is saturated at ~100

Post-TBD-16 precision fix, drift scores across meaningful denominators: superset **100**/n26, posthog **100**/n406, cal.com **100**/n17, Ghost **100**/n34, caveman **97**/n368. The only non-~100 values are tiny-denominator edges: superpowers 75/**n4** and icm 0/**n1** (its single accepted-template FP). So on the calibration corpus, `routing_drift` is **high-precision but near-zero-variance** — it says "router paths are clean" almost everywhere. That is genuinely good news about the sample, but as a **weight**, a signal saturated at 100 and weighted *joint-highest (3)* mostly adds a constant ~300 to every numerator and pulls headlines toward 100, **diluting** the sub-scores that actually discriminate (`coverage`, `bloat`). Weighting the flattest signal highest is a miscalibration. This is the run-6 error class (do not weight a signal for what it is not measuring) resurfacing on the *other* side of the precision fix — the fix removed the false positives, and in doing so removed the variance that would justify a high weight on this corpus.

### 4.2 Blocker B — the `orphans` raw sub-score measures layout style, not rot

TBD-14 (closed 2026-08-26) established that of **1 077** residual orphans across the corpus, only **20 are `genuine-abandoned`**; the other 1 057 are accepted layout classes (convention/runtime-discovered 519, route-to-directory-nested 349, dated-archival 189). But the `orphans` **sub-score** is `1 − orphaned/candidates` over *all* candidates — it does not net out the accepted classes. So the low scores (superset **1**/n113, claude-mem **0**/n61, posthog **11**/n678) are overwhelmingly counting **accepted layout**, not routing failure. Weighting `orphans: 2` therefore drags headlines down for repos whose only "sin" is routing-to-directories or shipping dated archives — precisely the layout-vs-rot conflation TBD-14 spent four runs proving the *findings* must not make. TBD-14 made `orphans` weighting-**eligible** (the fix + classification are correct), but "eligible" was about the finding correctness; the **sub-score-to-weight mapping** is a distinct question that only becomes visible when you try to assign the weight — which is now.

### 4.3 What discriminates cleanly

`coverage` (0 → 36 → 73 → 79 → 87 → 89 → 100) and, post-fix, `bloat` (55 → 60 → 80 → 100) both spread across the corpus and track something a reader would recognize as routing/hygiene health. These two are cleanly weightable today.

### 4.4 Disposition

run-7 **produced** the consolidated data TBD-10 was blocked on, and that data says the weights are **not** a clean four-number fit: two sub-scores need a scoring/interpretation decision before a weight is meaningful. Candidate directions (none chosen here — this is the `/decisions` input):

1. **Down-weight or conditionally-weight `routing_drift`** given its saturation (e.g. weight it for its *floor-catching* role — icm's 0 — rather than as a headline driver), **or** accept the saturation as "clean routing is the common case" and keep a high weight knowingly.
2. **Re-base the `orphans` sub-score on genuine-abandoned only** (net out the TBD-14 accepted classes so the score measures rot, not layout) — likely a **new TBD / its own build loop**, since it changes what `orphans` scores — **or** weight `orphans` low to bound its layout-driven pull.
3. Set `coverage` and `bloat` weights first (they are ready), and treat the `drift`/`orphans` weights as gated on 1–2.

**No weight number is set.** The honest read is that TBD-10 stays **Open with a sharpened question**, and item 2 likely spawns a new sub-score-basis TBD for `orphans`.

---

## 5. TBD status after run-7

| TBD | Status after run-7 |
|---|---|
| **TBD-10** (weights) | **Open — data now EXISTS, but reveals two weighting blockers.** `routing_drift` saturated at ~100 (§4.1); `orphans` raw score layout-dominated (§4.2). `coverage`/`bloat` weightable now. Routes to `/decisions`: down-weight/condition drift, re-base or bound orphans, set coverage/bloat first. Likely spawns an orphans-basis TBD. **No number.** |
| **TBD-11** (bloat cutoffs) | **Shape confirmed in the wild; cutoffs assessable.** `ROUTER_TOKEN=3000` and `CHAIN_TOKEN=6000` are data-supported (§2.3) and can move from guess to decision. `CHAIN_DEPTH=4` is **under-determined** (only posthog at depth 5; no depth-3/4 observations). Routes to `/decisions`. |
| **TBD-12** (`MIN_FILES`) | **Open — no new data** (`coverage.ts` unchanged; run-7 = run-6). superpowers `coverage 100` off one **test** dir re-confirmed. A **policy call on existing data**, not data-blocked. Routes to `/decisions` resolve-or-defer. **No number.** |
| **TBD-14** (orphan scope) | **Resolved** (2026-08-26). Note: §4.2 is **not** a reopening — the findings are correct; the *sub-score-to-weight* mapping is a new question under TBD-10. |
| **TBD-16** (drift precision) | **Resolved** (2026-08-25). §4.1 records a *consequence* of the fix (variance collapse), not a defect. |

**No threshold was resolved in this file. Rule 7 intact. B-A-MCP was not audited.**

---

## 6. What the next loop needs

1. **`/decisions` on TBD-11 cutoffs** — ratify `ROUTER_TOKEN=3000` (or 4000, score-neutral) and `CHAIN_TOKEN=6000` from §2.2–2.3; decide `CHAIN_DEPTH` explicitly as thin/under-determined (keep 4 conservatively, or defer). If ratified, the constants move from `TODO: TBD-11` stubs to decided values — a code change under TDD, `src/API.md` untouched (schema unchanged), ledger unchanged.
2. **`/decisions` on TBD-10** — the two blockers in §4. Expect this to sharpen the question and likely open an `orphans`-sub-score-basis item, not to yield four final weights.
3. **`/decisions` on TBD-12** — resolve-or-defer `MIN_FILES` on the existing (unchanged) evidence.
4. **Corpus question for the numbers.** The pinned nine are nine **different authors/orgs** — already a neutral, multi-author external sample (B-A-MCP, the single-author repo, is and stays excluded). For the *cutoff* numbers (§2) the nine suffice. The one genuinely thin spot is `CHAIN_DEPTH` (a single depth>2 observation) — a refreshed or larger corpus would help only that one cutoff, not the others. A fresh external corpus is therefore **not** a blocker for TBD-11/TBD-12; it is optional hardening for the depth cutoff and for TBD-10 variance.
5. **The README true-sample stays gated** behind TBD-10/11/12 landing as decided values, and must be a true run.
