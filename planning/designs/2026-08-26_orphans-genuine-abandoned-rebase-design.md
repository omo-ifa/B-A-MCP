# Design — re-base the `orphans` sub-score onto genuine-abandoned rot (TBD-18)

**Date:** 2026-08-26
**Status:** DESIGN (WHAT & WHY only). No scorer code changes with this document. Build is a later loop (`superpowers:writing-plans` → TDD → review → re-validate).
**Amended 2026-08-26** (`planning/decisions/2026-08-26_tbd-19-tbd-20-d1-basis-d4b-disposition.md`): the first build landed but the §6 re-validation found two silent-FN vectors in the detector basis (`planning/calibration/2026-08-26_context-audit-tbd-18-revalidation.md`) → **TBD-19** (D1 keyed on the over-broad `routedDirs`) and **TBD-20** (D4b's `plans/`/`CHANGELOG/` convention guess). §D1, §D4, and the §5 table below are amended to their resolved forms; the numerator-only shape, surfacing, findings enumeration, and close condition are unchanged. The amended text is marked inline.
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

**(Amended 2026-08-26 — TBD-19; refined at re-validation.)** The original spec keyed D1 on `routedDirs`, which the re-validation proved over-broad: `graph.ts` populates `routedDirs` from *file-parent* additions (a router linking the file `dir/file.md` adds `dir`) and root `""` as well as genuine directory-target routes, so D1 netted any doc nested below a directory that merely *contained a linked file* — silently netting the genuine-abandoned Ghost `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md`. The **first fix attempted** was a straight re-base onto the directory-target set (`dirTargets`), but the categorical re-validation showed that **removing the `routedDirs` guard reintroduces a silent FN in the other direction**: a doc whose immediate parent is a *file-parent-routed* directory (in `routedDirs`, not `dirTargets`) then falls through to the ancestor scan and matches a **distant** `dirTargets` ancestor *through* the intervening file-parent directories — netting the live posthog PRDs `products/desktop/docs/plans/{browser-tabs,skills-tab}.md` via `products` three levels up (and 84 `docs/internal/**` docs of the same shape). D1 is therefore keyed on the **nearest routing-known ancestor**, using both sets:

**Signal:** scan the doc's ancestor directories from the immediate parent upward and take the **nearest routing-known ancestor** — the first one in **`routedDirs`** (the closest directory the routing layer touches at all). D1 fires iff that nearest ancestor is a **strict** ancestor (an intervening subdirectory sits between it and the doc) **and** is a genuine **directory-target** (in **`dirTargets`**). If the nearest routing-known ancestor is the immediate parent → *directly in a routed dir* → not nested. If it is a strict-ancestor **file-parent** (in `routedDirs`, not `dirTargets`) → not netted (MSW; the PRDs). If no ancestor is routing-known → not netted.

**The two input sets:** `routedDirs` locates the nearest directory the routing layer touches (the *shield* the original guard provided); `dirTargets` (the flattened union of the `dirTargetsBySrc` values `graph.ts` records when a router routes to a *directory* target) decides whether that nearest ancestor is a real directory route. `dirTargets` is **exposed from `buildGraph` as `GraphResult.dirTargets`**; `AcceptedLayoutCtx` carries **both** `routedDirs` and `dirTargets` (D1 needs both — `routedDirs` is **not** dropped). `underRoutedDir` (the orphan-candidate gate) still reads `routedDirs` and is unchanged.

**Input-set note (per review):** D1 operates on the **post-TBD-14** candidate set. TBD-14's directory-only propagation already **reaches** documents directly inside a routed directory-target (from a reached source, via `dirTargetsBySrc` → `docsByParentDir`), so those are not orphans and never reach D1. D1 therefore only catches what directory-only propagation deliberately **left unreached**: nested docs whose nearest routing-known ancestor is a directory-target. A reader implementing D1 must feed it the residual orphan set with the existing `routedDirs` and `dirTargets`, **not** re-derive reachability.

**Tightness:** structural — a fact about the routing graph and the directory tree. The nearest-routing-known rule is the statement that actually holds (the `routedDirs`-only form over-nets via a strict-ancestor file-parent; the `dirTargets`-only form over-nets via a distant dir-target reached through file-parents); both failure directions are visible FPs, never silent FNs.

**Secondary (designed) effect:** where the rule nets *less* than the original `routedDirs` D1 (the MSW class), §4 named-gap docs (component-manifests, test-harness fixtures, bare `docs/**`) flip to **counted** — exactly what §4 says should happen in v1 (visible FP by construction). Where the parent or a nearer ancestor is a file-parent (the PRD / `docs/internal/**` class), those docs stay **counted**, so the TBD-20 goal (live PRDs counted) is achieved by D1 as well as by the D4b change. The re-validation measures the new `genuine_abandoned_count` per repo; `orphans` carries no headline weight, so there is zero score impact today.

**Edge case A (documented, left counted):** a doc **directly inside** a directory that is in `dirTargets` only because an **unreached** non-root doc routed it. Its nearest routing-known ancestor *is* the immediate parent, so D1 does **not** fire; it stays counted (genuine-abandoned). Safe direction — such a doc's only route is itself unreachable, plausibly real rot; mis-counting is a visible FP.

**Edge case B (documented residual silent FN, accepted — the one non-visible direction):** a doc **strictly nested** under a directory-target that is sourced **only by an unreached** doc (e.g. `zone/sub/x.md` where an unreached island doc routes `zone/` as a directory and `sub` is not itself routing-known). Its nearest routing-known ancestor is the strict-ancestor dir-target `zone`, so D1 **does** fire and nets it — even though `zone`'s route is unreachable, so `x` is genuinely unreachable. This is the single residual silent-FN vector in the netting path, and it is **accepted, not fixed, in v1**: (a) it is **pre-existing** — every prior D1 form (`routedDirs`-only, `dirTargets`-only) netted it too; (b) it is the exact case the **Rejected: reached-source-restricted `dirTargets`** option (see the decision record) would close, deferred because the `dirTargets` flatten is all-source (§"the input set"); (c) it is **empirically clean on the pinned corpus** — the §6 re-validation confirms all 20 genuine-abandoned survive, so no real doc hits it there; (d) the doc still emits a **visible `orphan` finding** — only `genuine_abandoned_count` under-counts, and `orphans` carries no headline weight. The ratchet (§9) re-opens it if a future corpus surfaces a real casualty.

### D2 — skill-discovery

**Signal:** some ancestor directory of the doc contains a walked `SKILL.md`. Build the set `skillDirs = { parentDir(d) : basename(d) == "SKILL.md" }` from the walked doc set (SKILL.md is walked — it is an in-scope `.md`, `isRoot=false`); the doc is skill-discovered if any ancestor directory ∈ `skillDirs`.

**Tightness:** convention, well-attested — a directory carrying a `SKILL.md` is a skill loaded whole by directory convention; nothing under it is unreferenced-by-design. Corpus: superpowers skill-support, claude-mem skill dirs, posthog `products/*/skills/**`, cal.com `agents/skills/**`, caveman.

### D3 — agent-runtime config

**Signal (path-recognition, sanctioned for this class):** the doc's path is under `.claude/**` (walk already scopes `.claude` in and hard-skips only `.claude/commands`), **or** the doc is root-level `WARP.md`, **or** under `cursor-hooks/**`. `.cursor/`/`.windsurf/` trees are dot-directories not in the walk's `DOT_ALLOW`, so they are never candidates and need no rule.

**Tightness:** these are agent/tool **runtime** directories by definition; the TBD-14 ruling enumerated them **by path** for exactly this class (unlike test fixtures, §4). Corpus: posthog `.claude/agents|rules/**`, superset `.claude/projects/**`, Ghost `.claude/commands/**`, claude-mem `WARP.md` + `cursor-hooks/**`.

### D4 — tight dated/versioned-archival (structural only)

**(Amended 2026-08-26 — TBD-20.)** The original spec's D4b netted any doc under a `plans/` or `CHANGELOG/` directory **segment** — a *convention* guess flagged (here and in §5) as the sole silent-FN vector. §6.2's individual check confirmed the vector: two live, ready-to-build posthog PRDs under `products/desktop/docs/plans/` (`Status: ready-for-agent` / `Ready to build`) were silently netted. Both segment rules are **dropped** and replaced by a second **structural** sub-rule (version-shaped basename), so D4 nets only on self-evident filename structure, never on a directory name.

**Signal — two structural sub-rules, netted only where tight:**
- **D4a dated-filename** — the doc's basename (or any path segment) contains a `\d{4}-\d{2}-\d{2}` date. **Structurally tight** — a date embedded in the name is self-evidence of an archival/dated document; there is no realistic way a live, must-be-routed doc carries a full date in its filename. Corpus: Ghost `deleted-/draft-/published-2014-12-19-*.md`, dated plan docs (including live-directory plans that *are* dated).
- **D4b version-shaped basename** — the doc's basename (minus extension) is essentially a full semantic version: `^v?\d+\.\d+(\.\d+)+$` (optional leading `v`, **≥2 dots**). **Structurally tight, same class as D4a** — a file literally named `1.4.1.md` / `6.1.0.md` is a released-version artifact by self-evidence, independent of its directory. Corpus: superset `CHANGELOG/1.4.1.md … 6.1.0.md` (32 archives, all 3-component semver → all netted). Ambiguous two-part forms (`v2`, `2.0`) do **not** net — they stay counted, the safe direction.

**Explicitly NOT netted:** a bare `docs/**` path (unchanged — `docs/` routinely holds live docs, a named §4 gap); a **`plans/`** or **`CHANGELOG/`** directory that is *not* backed by a dated or version-shaped filename (a live PRD under `plans/` now stays counted, not silently netted).

**Consequence:** D4 nets out the dated-filename and version-shaped-basename residuals only. On the pinned corpus the change is exact: all 32 superset CHANGELOG version archives stay netted (now via D4b's structural version shape), and the 2 live posthog PRDs flip from netted to **counted**. Residuals that are archival *only* by directory convention (an undated, non-versioned doc under `plans/`/`CHANGELOG/`/`docs/`) stay **counted** (visible FP). That is the intended boundary.

## 4. Named visible-FP gaps — counted in v1, mechanization → `/decisions`

These accepted classes **resist deterministic, tight detection**. Per the tie-breaker, the design does **not** guess a loose rule for them — a loose exclusion would risk the silent-FN it forbids. They stay **counted as genuine-abandoned** (visible FP, still enumerated as findings), and their mechanization is a future `/decisions` ruling (the ratchet). The design **names** them so a future session does not mistake the gap for completeness (~127 corpus docs remain counted here):

- **component-manifest content (110)** — e.g. cal.com `packages/app-store/*/DESCRIPTION.md`, one per plugin, mandated by `packages/app-store/CONTRIBUTING.md`. Detecting "this is a per-component manifest" needs **registry knowledge** (the contribution convention or the codegen glob) that is repo-specific; a generic `DESCRIPTION.md` filename rule is both too broad (other repos) and too narrow (other manifest names). → `/decisions`.
- **test-harness fixtures (17)** — markdown a test/benchmark harness enumerates (caveman `tests/caveman-compress/**` globbed by `benchmark.py`; Ghost `fixtures/import/**` via `fixture-utils.js`). The TBD-14 ruling **explicitly forbade path-prefix recognition** here: `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` is a genuine human-read doc under `test-utils/` and a bare `test/` rule would silently swallow it (a proven silent FN). Tight recognition requires parsing the harness. → `/decisions`.
- **bare `docs/**`** — the loose remainder of dated-archival (§D4). → `/decisions`.

## 5. FP/FN framing — the design's spine, per rule

| detector | fires on | failure direction if wrong |
|---|---|---|
| D1 route-to-dir-nested | nearest routing-known ancestor (first in `routedDirs`) is a strict-ancestor dir-target (in `dirTargets`) | none (structural); mis-miss = visible FP. **(Amended TBD-19 — `routedDirs`-only over-nets via a strict-ancestor file-parent (MSW); `dirTargets`-only over-nets via a distant dir-target reached through file-parents (live PRDs); the nearest-routing-known rule removes both.)** |
| D2 skill-discovery | ancestor has `SKILL.md` | over-broad only if a `SKILL.md` sits above genuinely-abandoned docs — unattested; visible FP if under-fires |
| D3 agent-runtime | `.claude/**`, `WARP.md`, `cursor-hooks/**` | path set is definitional; visible FP if under-fires |
| D4a dated-filename | date in name | structural self-evidence; visible FP if under-fires |
| D4b version-shaped basename | full-semver basename `^v?\d+\.\d+(\.\d+)+$` | structural self-evidence, same class as D4a; visible FP if under-fires. **(Amended TBD-20 — replaced the `plans/`/`CHANGELOG/` segment convention, which was a silent-FN vector.)** |
| gaps (§4) | not netted | counted = visible FP by construction |

**(Amended 2026-08-26.)** After TBD-19 + TBD-20 **no detector keys on a directory-name convention** — every net is a structural fact (routing-graph membership, a `SKILL.md` ancestor, a definitional path set, a dated/versioned basename). The §6 re-validation still checks the D4b version-shape nets **individually** (the successor to the old D4b-segment check) and confirms MSW is now among the counted, but no detector is trusted on convention alone.

## 6. Close condition (future build's exit criterion — not now)

TBD-18 closes when, after the build (TDD detectors + sub-score tests), a **categorical re-validation on the pinned nine-repo corpus** confirms:

1. **No genuine rot silently netted.** Every orphan the re-base moves out of `genuineAbandonedCount` is a true accepted-layout doc. The **20 genuine-abandoned** residuals from the TBD-14 re-val #2 must all still be counted (plus the still-counted §4 resisters).
2. **Version-shape silent-FN check (per review; amended TBD-20).** The docs netted by **D4b** (version-shaped basename `^v?\d+\.\d+(\.\d+)+$`) are checked **individually**, separately from D4a's dated-filename nets — a version-shaped basename is structurally self-evident but the check confirms it on-corpus. If any version-shape-netted doc is genuine rot, D4b returns to `/decisions`. The dropped `plans/`/`CHANGELOG/` segment cases are re-checked too: the 2 live posthog PRDs (`plans/`, non-versioned) must now be **counted**, not netted. Aggregate "the 20 survive" is **not** sufficient evidence for D4b.
3. Only then does `orphans` become eligible to carry weight; setting the weight is a **separate** `/decisions` (TBD-10), and the README true-sample follows that.

## 7. Testing approach (for the build loop, not this document)

Unit tests (TDD, `node:test`): one per detector (D1 nearest-routing-known-ancestor rule — **including the two TBD-19 regressions: (a) the MSW shape, a doc whose nearest routing-known ancestor is a strict-ancestor file-parent, must NOT net; (b) the PRD shape, a doc whose parent is a file-parent but with a distant `dirTargets` ancestor, must NOT net — with the discriminator that the same deep path DOES net when no intervening dir is routing-known**; plus a graph-level MSW and PRD end-to-end test, and a `.`-route test that `dirTargets` excludes root `""`; D2 SKILL.md ancestor vs. none; D3 each path form; D4a dated-filename; **D4b version-shaped basename `1.4.1.md` nets, ambiguous `v2`/`2.0` does not, a live non-versioned doc under `plans/` stays counted — the TBD-20 regression**; and a bare `docs/` doc that must **stay counted**); sub-score tests (an accepted-layout orphan does not move the score; a genuine-abandoned orphan does; `orphanCandidateTotal` and the findings array are unchanged; an all-accepted repo scores ~100). **Reconstruction test:** `stats.genuine_abandoned_count` is present in the output and satisfies `orphans.score == 1 − stats.genuine_abandoned_count / orphanCandidateTotal` (the score is reconstructable from output).

**(Amended 2026-08-26.)** The rule-8 / rule-2 note below was written for the **original** build, which added `stats.genuine_abandoned_count`. That build landed; the field already ships. The **TBD-19/20 amendment build changes only detector internals** (`accepted-layout.ts` D1 basis + D4 rule; a one-line `dirTargets` exposure in `graph.ts`): no output field is added, no `outputSchema` widened. Rule 8 is triggered **minimally** — D4's class semantics expand to net version-shaped basenames, so the documented class name **"tight dated-archival" → "tight dated/versioned-archival"** in `src/API.md` (the two `stats`/`subscores` prose mentions) updates in the same build commit; no schema/field change. Otherwise the class names and reconstruction identity are unchanged (re-read against the final code to confirm). Expect **no ledger cost change** (re-measure to confirm, per rule-2 discipline). The original note is retained for provenance:

> `src/API.md` updates in the same build commit (rule 8 — the `orphans` semantics description changes **and** the new `stats.genuine_abandoned_count` field is documented). **Rule 2: the context-budget ledger is RE-MEASURED this build** — adding `stats.genuine_abandoned_count` is a **schema addition** (it widens the `tools/list` output schema / `stats` object), so the standing tool-definition cost must be re-measured and the ledger updated in the same commit, not assumed unchanged. (The earlier "ledger unaffected" reading was for a numerator-only change with no new field; surfacing the count changes that.)

## 8. Out of scope

- Setting the `orphans` weight (TBD-10).
- Changing findings enumeration (stays exhaustive).
- Mechanizing the §4 resisters (each is its own `/decisions` item).
- The README true-sample (gated behind the weight, behind this).

## 9. `/decisions` items this design defers (the ratchet)

1. component-manifest detection.
2. test-harness-fixture detection.
3. bare-`docs/**` disposition.
4. ~~If re-validation (§6.2) shows `plans/` or `CHANGELOG/` is loose on-corpus, that segment's disposition.~~ **RESOLVED 2026-08-26 (TBD-20)** — re-validation confirmed `plans/` loose (2 live PRDs); both segment rules dropped, replaced by the structural version-shaped-basename net (§D4b). See the decision record.
5. **Per-doc attribution (v1.1)** — surfacing *which* detector netted each accepted-layout orphan (a per-finding tag), beyond the reconcilable `stats.genuine_abandoned_count`. Deferred as a machine-readable convenience, not a correctness need; it widens the findings schema, so it is its own decision.
6. **D1 nested-under-unreached-directory-target residual (§D1 edge case B)** — the one residual silent-FN vector: a doc strictly nested under a `dirTargets` directory sourced only by an unreached doc is netted. Deferred (accepted in v1: pre-existing, empirically clean on the pinned corpus, still a visible `orphan` finding, `orphans` unweighted). The fix would be to restrict D1's `dirTargets` to reached-source directory-targets (the "Rejected: reached-source-restricted" option in the decision record). Re-open only if a future corpus surfaces a real casualty.
