# Calibration — orphans:1 raise re-validation + code-vs-taxonomy reconciliation — **RAISE REJECTED; orphans:1 → FINAL**

**Date:** 2026-09-01
**Tool state:** `main`-derived branch `docs/tbd-25-26-orphans-gate-reframe` at the D5-shipped code (`accepted-layout.ts` D1–D5, `graph.ts` numerator-only genuine-abandoned). No production code changed this session — measurement only. Build: `npm run build` clean; harness calls the production entrypoints.
**Purpose:** The reframed TBD-10 gate (`planning/decisions/2026-09-01_tbd-25-26-counted-final-and-raise-gate-reframe.md`) made the `orphans:1` provisional→final raise conditional on a corpus re-validation measuring the residual visible-FP downward bias as **bounded**. This is that measurement. It also discharges the owner's standing requirement (2026-09-01): a **per-detector code-vs-taxonomy reconciliation artifact**, not another hand classification.
**Verdict:** The residual is **NOT a small tail** — the `orphans` numerator (`genuine_abandoned_count`) is **layout-dominated (~90% un-netted accepted-layout/convention/archival)**. The one new lever (bare-docs as tight-anchored doc-sites) was **verified and fails**. Per the owner's pre-committed rule, the raise is **rejected** and **`orphans:1` is ratified FINAL**; **TBD-10 closes**. TBD-25 and TBD-26 stay **counted-final** (TBD-26 **not** reopened). No weight number moves except the provisional→final status of `orphans:1` (value unchanged at 1).

---

## 0. Pinned corpus — no re-clone (Obs 12)

Nine clones under `~/dev/ba-calibration/`, pins re-verified unchanged from re-validation run #2: superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill `281f134`, icm-architect `b20fb45`.

## 1. Instrumentation fidelity — triple-tie (Obs 19)

The harness reconstructs the genuine-abandoned **set** by importing the production functions (`walk`, `buildGraph`, `computeSkillDirs`, `computeManifestDirs`, `isAcceptedLayout`) and classifying each `orphan` finding. For every one of the nine repos the reconstructed count **equals both** `buildGraph`'s `genuineAbandonedCount` **and** `runContextAudit`'s `stats.genuine_abandoned_count` (`recon == buildGraph == official`). The set is trustworthy before any number below is used.

## 2. Corpus orphans snapshot (as shipped)

| repo | cand | orphanCount | genuine (numerator) | orphans sub-score |
|---|--:|--:|--:|--:|
| superset | 113 | 112 | 78 | **31** |
| posthog | 678 | 604 | 206 | 70 |
| cal.com | 218 | 170 | 22 | 90 |
| Ghost | 36 | 10 | 5 | 86 |
| superpowers | 61 | 61 | 5 | 92 |
| caveman | 91 | 59 | 40 | 56 |
| claude-mem | 61 | 61 | 18 | 70 |
| one-skill / icm | 0 | 0 | 0 | null (guard) |
| **corpus** | **1258** | **1077** | **374** | |

## 3. The reconciliation — `genuine_abandoned_count` (374) attributed by reason-not-netted

The prior re-validations validated the **taxonomy** ("every residual classifies into an accepted class"); none reconciled that taxonomy against **what the detectors net**. Doing so now: the code's numerator is 374, of which only a small minority is true rot. Every doc attributed to a mutually-exclusive reason-not-netted bucket (sums to 374):

| count | reason not netted | class / disposition |
|--:|---|---|
| **115** | **bare-`docs/**` plain** — no generator artifact anywhere in ancestry | TBD-26 counted-final; **no tight source-free mechanism** (§4) |
| 72 | doc-site anchored — under a `docusaurus.config`/sidebars tree | **superset only**; a detector would be single-repo self-tuned (§4) |
| 68 | month-slug archive — a `YYYY-MM-slug/` directory segment | D4a near-miss (D4a matches `YYYY-MM-DD` only); posthog `review_hog/eval/experiments/**` |
| 65 | plausibly-genuine standalone unreachable docs | the **defensible** positives; ~20 are themselves further un-netted convention (see below) |
| 23 | per-source `api_inventory.md` | registry shape D5 does not cover (posthog `warehouse_sources/**/sources/**`) |
| 17 | appstore `DESCRIPTION.md` with no `config.json` sibling | D5-tight **visible-FP by design** (L4) |
| 13 | test-harness fixtures | TBD-25 counted-final |
| 1 | nested `.claude/**` | D3 gap — `isAgentRuntimeConfig` matches root `.claude` only |
| **374** | | |

**Reading:** ~90% of the numerator is un-netted accepted-layout / convention / archival across **≥8 distinct classes**; the "65 plausibly-genuine" bucket is the most defensible (standalone docs genuinely unreachable from the routing layer), and manual audit shows ~20 of it is itself further un-netted convention (posthog `bundled-agents/{Explore,General,Plan}.md`, per-source vendor docs `*.posthog.com.md`/`*.docs.md`, `mcp/prompts/*.md`), leaving **≤~45 plausible true rot corpus-wide**. superset's `orphans 31` is driven almost entirely by its 73 `docs/**` files (a Docusaurus site), not by rot.

This is the layout-vs-rot conflation TBD-14→TBD-18 exist to reduce, still present at the **sub-score→numerator** level because the code nets far less than the taxonomy classified as accepted. It was invisible to every prior re-validation because none reconciled code-netting against the classification (→ Obs 36; WORKFLOW.md standing fix).

## 4. The one new lever — bare-docs as tight-anchored doc-sites — VERIFIED, FAILS

The only new decision-relevant claim was that bare-`docs/**` is dominated by published doc-sites carrying a **tight source-free generator-config anchor in a true ancestor** (a D5-style marker: `docusaurus.config.*`, `mkdocs.yml`, `*_versioned_docs`). Verified against the actual clones — for each of the 187 bare-docs residuals, scanning its real ancestor directories for a generator config:

| repo | bare-docs | ancestor-anchored (any generator) | plain / unanchored |
|---|--:|--:|--:|
| superset | 73 | 72 (`docs/docusaurus.config.ts` + sidebars) | 1 |
| posthog | 67 | **0** | 67 |
| caveman | 25 | **0** | 25 |
| claude-mem | 17 | **0** | 17 |
| superpowers | 5 | **0** | 5 |
| **corpus** | **187** | **72 (all one repo)** | **115 (61%)** |

- **STRONG generator config (docusaurus/mkdocs/antora/mdbook/vitepress) as the nearest ancestor: 0 / 187.** The 72 superset nets resolve to `sidebars.js` at the nearest level (`docs/docusaurus.config.ts` is a higher true ancestor — superset **is** a real Docusaurus site), but it is **one repo**.
- **115 / 187 (61%) are plain `docs/` folders with no generator artifact anywhere in ancestry** (posthog internal/handbook, caveman `docs/technical`, claude-mem `docs/**`, superpowers `docs/**`). **No tight source-free anchor exists for the dominant case.**
- **TBD-20 casualty probe:** both live posthog PRDs (`products/desktop/docs/plans/browser-tabs.md`, `skills-tab.md`) are **unanchored (safe)** — a doc-site net would not swallow them. Correct, but moot: the lever fails on dominance/generalizability regardless.

**Conclusion:** ancestor-anchoring does **not** hold as dominant. A doc-site detector (D6) would net **one repo's** tree (superset) and leave the 61% majority counted — a single-repo-tuned rule (the self-tuning trap the calibration checklist forbids). The reclassification "bare-docs ≈ mechanizable doc-sites" is **false**. TBD-26 is **not** reopened.

## 5. Decision — raise rejected; `orphans:1` FINAL; TBD-10 closed

Per the owner's pre-committed rule (2026-09-01: *lever holds → reopen TBD-26; lever fails → hold orphans:1 as final*):

- **The reframed gate's "bounded residual" condition is not met** — but this is the ratchet **firing correctly**, not a premise collapse. The layout tint was already documented (TBD-19/20 re-val §5: `genuine_abandoned_count >> 20` is the intended boundary) and already priced into the weight (TBD-10: `orphans:1` bounds the §4-gap headline pull at ±8; superset 31 is named §4-gap-driven). The optimistic branch (raise) does not fire; the pessimistic branch (hold) does.
- **`orphans:1` is ratified FINAL** (value unchanged; provisional→final status only). It is the largest weight that bounds the layout-tint headline pull; **raising to 2 would double a layout-dominated signal's contribution** — measured, netting bare-docs alone moves the sub-score up to +65 (superset), so a higher weight amplifies exactly the tint. Rejected accordingly.
- **`TBD_10_WEIGHTS` (`{routing_drift:1, coverage:3, bloat:1, orphans:1}`) and `ROUTING_LAYER_KEYS` are UNCHANGED** — no code moves; the ratification is a status flip in the tracker (rule 2 ledger untouched, rule 8 no schema/API.md change).
- **TBD-10 CLOSES.** All four sub-score weights are now final.
- **TBD-25 / TBD-26 stay counted-final** (TBD-26 not reopened — §4).

## 6. Known bounded visible-FP gaps (recorded, not tracked as blockers)

The §3 reconciliation names eight un-netted classes. All are **counted (visible FP)** — the tie-breaker-safe state — and **none blocks anything** now that the raise is closed. Each is precision-only future work reachable via the ratchet (an explicit future `/decisions` + detector loop), never a silent widening: doc-site (single-repo, low value), month-slug archive (a D4a widening — but `YYYY-MM-slug` risks over-netting live month-tagged docs), per-source inventory (a registry shape), nested `.claude/**` (a bounded D3 fix, 1 doc). Left as documented visible-FP, consistent with TBD-25/26.

## 7. Downstream

- **README true-sample** stays gated behind the finalized TBD-10/11/12 numbers — unaffected by this session (all now final). Not produced here.
- **Standing fix (Obs 36):** WORKFLOW.md "Calibration & measurement" checklist gains the rule that a re-validation for a score that nets an accepted class via a detector must reconcile **code-netting** against the taxonomy (per-detector netted == accepted), not merely classify residuals.

## Non-goals

Sets no new weight/threshold number. Changes no production code. Does not reopen TBD-14/18 (their classification and the numerator-only model are correct and closed — this is the distinct sub-score-tint question, now resolved by ratifying the bounding weight as final). Not the README sample.
