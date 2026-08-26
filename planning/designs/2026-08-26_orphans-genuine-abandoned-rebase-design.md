# Design — re-base the `orphans` sub-score onto genuine-abandoned rot (TBD-18)

**Date:** 2026-08-26
**Status:** DESIGN (WHAT & WHY only). No scorer code changes with this document. Build is a later loop (`superpowers:writing-plans` → TDD → review → re-validate).
**TBD:** TBD-18 (direction resolved 2026-08-26 — `planning/decisions/2026-08-26_tbd-10-weights-partial-and-tbd-18-orphans-rebase.md`).
**Depends on:** TBD-14 (closed 2026-08-26; directory-granularity reachability in `src/tools/context-audit/graph.ts`) and its accepted-class taxonomy (`planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md`, `planning/calibration/2026-08-26_context-audit-tbd-14-revalidation-run2.md`).
**Standing tie-breaker (the spine of this design):** a **visible false positive beats a silent false negative**. Here a **silent FN = scoring real rot as accepted** (worse — the sub-score exists to catch rot); a **visible FP = flagging an accepted-layout doc as rot** (acceptable — it is still enumerated as a finding). Every rule below is chosen so its failure direction is the visible one.

---

## 1. Why — the defect

run-7 (`planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md` §4.2), the first run to weight all four shape-clean sub-scores, showed the `orphans` **raw sub-score measures layout style, not rot**. Of TBD-14's **1 077** residual orphans across the pinned nine-repo corpus, only **20 are genuine-abandoned**; the other ~1 057 are accepted layout (route-to-directory-nested 349, convention/runtime-discovered 519, dated-archival 189). The sub-score is `1 − orphanCount / orphanCandidateTotal` over **all** unreachable candidates, so a low `orphans` score (superset 1/n113, claude-mem 0/n61) reflects a repo's directory conventions, not routing failure. That is why `orphans` is currently excluded from the headline weight (gated on this TBD).

TBD-14 established the accepted classes and closed by **hand-classifying** each residual during re-validation. The scorer computes **none** of them — it only computes reachability. This design makes the sub-score score **genuine-abandoned rot only** by detecting the accepted classes **deterministically at scoring time**, for the classes that can be detected tightly, and by explicitly declining (routing to `/decisions`) the classes that cannot.

## 2. What — the re-base

### 2.1 The scored/not-scored split (the one behavioural change)

- Today: every unreachable candidate increments `orphanCount`, and the sub-score is `subscoreFromCount(orphanCount, orphanCandidateTotal)`.
- Re-based: add a counter `genuineAbandonedCount` = unreachable candidates for which `isAcceptedLayout(doc)` is **false**. The sub-score becomes:

  **`orphans = 1 − genuineAbandonedCount / orphanCandidateTotal`** — **numerator-only**.

  The denominator stays `orphanCandidateTotal` (all under-routed-dir, non-furniture, non-root candidates). Numerator-only was chosen over netting the denominator too because the denominator is a **stable, cross-repo-comparable "how much could rot"**; shrinking it to `candidates − accepted` makes small-denominator repos noisy and changes what the ratio means per repo. An all-accepted-layout repo therefore scores **~100**, which is the correct answer (nothing is actually abandoned).

### 2.2 This is NOT a `FURNITURE`-style exclusion

`FURNITURE` (readme/license/… and `.github/`) removes a doc from **candidacy entirely** — no candidate, no finding, no denominator seat. The accepted-layout split is different and must stay different: an accepted-layout orphan **remains a candidate, remains a finding, remains in the denominator** — it is only removed from the **scored numerator**. Findings enumerate every unreachable candidate exactly as today, and the score is **reconcilable from output**: a reader sees every candidate as a finding (`stats.orphan_count`) **and** can reconstruct the sub-score from the surfaced numerator (`stats.genuine_abandoned_count`, §2.3) as `1 − genuine_abandoned_count / orphanCandidateTotal`. What is **not** in v1 output is the **per-doc attribution** — which specific detector netted each accepted-layout orphan. That is a machine-readable convenience, not a correctness requirement (the counts already reconcile the score), and it is explicitly deferred (§9). Do **not** implement this by moving classes into `FURNITURE`.

### 2.3 What does NOT change

- **Findings enumeration** — unchanged. Every unreachable candidate still emits its `orphan` finding.
- **`orphanCandidateTotal`** (the denominator) — unchanged.
- **`FURNITURE`** and the `.github/` exclusion — unchanged.
- **The `resolvedRefsFromRoots === 0` guard** (orphans → `null` when routing resolves nothing) — unchanged.
- **The `orphans` weight in `TBD_10_WEIGHTS`** — still gated under TBD-10; **this design does not set it.** `orphans` re-enters the headline only after this builds and the close-condition re-validation (§6) passes.
- **`stats.orphan_count`** — stays the count of orphan **findings** (every unreachable candidate), for transparency. Unchanged.

And one output field **is added** (so the re-based score is reconstructable from output, not just internal):

- **`stats.genuine_abandoned_count`** (NEW) — the scored numerator: unreachable candidates for which `isAcceptedLayout(doc)` is false. Surfacing it lets any consumer verify **`orphans.score == 1 − stats.genuine_abandoned_count / orphanCandidateTotal`** from the output alone. The two counts are stated explicitly and are different by design: `orphan_count` = every unreachable candidate (the findings population); `genuine_abandoned_count` = the subset scored as rot. `genuine_abandoned_count ≤ orphan_count`, and the gap is exactly the accepted-layout orphans the re-base declines to score.

## 3. The detectors — `isAcceptedLayout(doc)`

`isAcceptedLayout` returns true when **any** tight detector fires. It runs over the **already-computed orphan set** — candidates that are unreachable after TBD-14's reachability DFS. It classifies the residual; it never recomputes reachability.

### D1 — route-to-directory, nested

**Signal:** the doc's nearest routed-ancestor directory exists in `routedDirs`, but the doc is **not directly contained** in a routed directory (an intervening subdirectory sits between the nearest routed ancestor and the doc).

**Input-set note (per review):** D1 operates on the **post-TBD-14** candidate set. TBD-14's directory-only propagation already **reaches** documents directly inside a routed directory (from a reached source, via `dirTargetsBySrc` → `docsByParentDir`), so those are not orphans and never reach D1. D1 therefore only needs to catch what directory-only propagation deliberately **left unreached**: the nested docs one level or more below a routed directory. A reader implementing D1 must feed it the residual orphan set and the existing `routedDirs`, **not** re-derive reachability — the two must not disagree on the intervening-subdir case (that case is, by construction, exactly D1's target and exactly what TBD-14 does not reach).

**Tightness:** structural — it is a fact about the routing graph and the directory tree, not a guess. No silent-FN vector.

**Edge case (documented, left counted):** a doc directly inside a directory that is in `routedDirs` only because an **unreached** non-root doc routed it. Its immediate parent *is* a routed dir, so D1 does **not** fire; it stays counted (genuine-abandoned). This is the safe direction — such a doc's only route is itself unreachable, which is plausibly real rot, and mis-counting it is a visible FP, not a silent FN.

### D2 — skill-discovery

**Signal:** some ancestor directory of the doc contains a walked `SKILL.md`. Build the set `skillDirs = { parentDir(d) : basename(d) == "SKILL.md" }` from the walked doc set (SKILL.md is walked — it is an in-scope `.md`, `isRoot=false`); the doc is skill-discovered if any ancestor directory ∈ `skillDirs`.

**Tightness:** convention, well-attested — a directory carrying a `SKILL.md` is a skill loaded whole by directory convention; nothing under it is unreferenced-by-design. Corpus: superpowers skill-support, claude-mem skill dirs, posthog `products/*/skills/**`, cal.com `agents/skills/**`, caveman.

### D3 — agent-runtime config

**Signal (path-recognition, sanctioned for this class):** the doc's path is under `.claude/**` (walk already scopes `.claude` in and hard-skips only `.claude/commands`), **or** the doc is root-level `WARP.md`, **or** under `cursor-hooks/**`. `.cursor/`/`.windsurf/` trees are dot-directories not in the walk's `DOT_ALLOW`, so they are never candidates and need no rule.

**Tightness:** these are agent/tool **runtime** directories by definition; the TBD-14 ruling enumerated them **by path** for exactly this class (unlike test fixtures, §4). Corpus: posthog `.claude/agents|rules/**`, superset `.claude/projects/**`, Ghost `.claude/commands/**`, claude-mem `WARP.md` + `cursor-hooks/**`.

### D4 — tight dated-archival (with an explicit structural-vs-convention split)

**Signal — three sub-rules, netted only where tight:**
- **dated-filename** — the doc's basename (or any path segment) contains a `\d{4}-\d{2}-\d{2}` date. **Structurally tight** — a date embedded in the name is self-evidence of an archival/dated document; there is no realistic way a live, must-be-routed doc carries a full date in its filename. Corpus: Ghost `deleted-/draft-/published-2014-12-19-*.md`, dated plan docs.
- **`plans/` segment** and **`CHANGELOG/` segment** — a path segment named `plans` or `CHANGELOG`. **Convention tight, not structural** — this is a *guess* that those segments mean "archival by convention." It held on the pinned corpus (the TBD-14 re-val accepted them), but a repo that keeps *live, must-be-routed* docs under a `plans/` directory would make this a **silent-FN vector**.

**Explicitly NOT netted:** a bare `docs/**` path. `docs/` routinely holds live documentation, so excluding it wholesale is loose → silent-FN risk. It is a named gap (§4).

**Consequence:** D4 nets out a **subset** of the corpus's 189 dated-archival residuals — the dated-filename / `plans/` / `CHANGELOG/` ones. Residuals that are archival *only* by sitting under `docs/` (no date, not `plans/`, not `CHANGELOG/`) stay **counted** (visible FP). That is the intended boundary.

## 4. Named visible-FP gaps — counted in v1, mechanization → `/decisions`

These accepted classes **resist deterministic, tight detection**. Per the tie-breaker, the design does **not** guess a loose rule for them — a loose exclusion would risk the silent-FN it forbids. They stay **counted as genuine-abandoned** (visible FP, still enumerated as findings), and their mechanization is a future `/decisions` ruling (the ratchet). The design **names** them so a future session does not mistake the gap for completeness (~127 corpus docs remain counted here):

- **component-manifest content (110)** — e.g. cal.com `packages/app-store/*/DESCRIPTION.md`, one per plugin, mandated by `packages/app-store/CONTRIBUTING.md`. Detecting "this is a per-component manifest" needs **registry knowledge** (the contribution convention or the codegen glob) that is repo-specific; a generic `DESCRIPTION.md` filename rule is both too broad (other repos) and too narrow (other manifest names). → `/decisions`.
- **test-harness fixtures (17)** — markdown a test/benchmark harness enumerates (caveman `tests/caveman-compress/**` globbed by `benchmark.py`; Ghost `fixtures/import/**` via `fixture-utils.js`). The TBD-14 ruling **explicitly forbade path-prefix recognition** here: `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` is a genuine human-read doc under `test-utils/` and a bare `test/` rule would silently swallow it (a proven silent FN). Tight recognition requires parsing the harness. → `/decisions`.
- **bare `docs/**`** — the loose remainder of dated-archival (§D4). → `/decisions`.

## 5. FP/FN framing — the design's spine, per rule

| detector | fires on | failure direction if wrong |
|---|---|---|
| D1 route-to-dir-nested | structural graph fact | none (structural); mis-miss = visible FP |
| D2 skill-discovery | ancestor has `SKILL.md` | over-broad only if a `SKILL.md` sits above genuinely-abandoned docs — unattested; visible FP if under-fires |
| D3 agent-runtime | `.claude/**`, `WARP.md`, `cursor-hooks/**` | path set is definitional; visible FP if under-fires |
| D4a dated-filename | date in name | structural self-evidence; visible FP if under-fires |
| D4b plans/CHANGELOG segment | convention guess | **silent-FN vector if a repo keeps live docs there** — re-validation must target these (§6) |
| gaps (§4) | not netted | counted = visible FP by construction |

Only **D4b** carries a genuine silent-FN vector; §6 makes it a specific re-validation target rather than trusting the aggregate.

## 6. Close condition (future build's exit criterion — not now)

TBD-18 closes when, after the build (TDD detectors + sub-score tests), a **categorical re-validation on the pinned nine-repo corpus** confirms:

1. **No genuine rot silently netted.** Every orphan the re-base moves out of `genuineAbandonedCount` is a true accepted-layout doc. The **20 genuine-abandoned** residuals from the TBD-14 re-val #2 must all still be counted (plus the still-counted §4 resisters).
2. **Segment-specific silent-FN check (per review).** The docs netted by **D4b** (`plans/` / `CHANGELOG/` segments) are checked **individually**, separately from D4a's dated-filename nets — because D4b is convention-tight, not structural. If any `plans/`/`CHANGELOG/`-netted doc is genuine rot, D4b is a silent-FN vector and returns to `/decisions`. Aggregate "the 20 survive" is **not** sufficient evidence for D4b.
3. Only then does `orphans` become eligible to carry weight; setting the weight is a **separate** `/decisions` (TBD-10), and the README true-sample follows that.

## 7. Testing approach (for the build loop, not this document)

Unit tests (TDD, `node:test`): one per detector (D1 nested vs. direct-in-routed-dir; D2 SKILL.md ancestor vs. none; D3 each path form; D4a dated-filename, D4b plans/CHANGELOG, and a bare `docs/` doc that must **stay counted**); sub-score tests (an accepted-layout orphan does not move the score; a genuine-abandoned orphan does; `orphanCandidateTotal` and the findings array are unchanged; an all-accepted repo scores ~100). **Reconstruction test:** `stats.genuine_abandoned_count` is present in the output and satisfies `orphans.score == 1 − stats.genuine_abandoned_count / orphanCandidateTotal` (the score is reconstructable from output).

`src/API.md` updates in the same build commit (rule 8 — the `orphans` semantics description changes **and** the new `stats.genuine_abandoned_count` field is documented). **Rule 2: the context-budget ledger is RE-MEASURED this build** — adding `stats.genuine_abandoned_count` is a **schema addition** (it widens the `tools/list` output schema / `stats` object), so the standing tool-definition cost must be re-measured and the ledger updated in the same commit, not assumed unchanged. (The earlier "ledger unaffected" reading was for a numerator-only change with no new field; surfacing the count changes that.)

## 8. Out of scope

- Setting the `orphans` weight (TBD-10).
- Changing findings enumeration (stays exhaustive).
- Mechanizing the §4 resisters (each is its own `/decisions` item).
- The README true-sample (gated behind the weight, behind this).

## 9. `/decisions` items this design defers (the ratchet)

1. component-manifest detection.
2. test-harness-fixture detection.
3. bare-`docs/**` disposition.
4. If re-validation (§6.2) shows `plans/` or `CHANGELOG/` is loose on-corpus, that segment's disposition.
5. **Per-doc attribution (v1.1)** — surfacing *which* detector netted each accepted-layout orphan (a per-finding tag), beyond the reconcilable `stats.genuine_abandoned_count`. Deferred as a machine-readable convenience, not a correctness need; it widens the findings schema, so it is its own decision.
