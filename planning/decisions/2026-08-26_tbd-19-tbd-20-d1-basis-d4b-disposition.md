# Decision — TBD-19 (D1 route-to-dir-nested basis) + TBD-20 (D4b plans/CHANGELOG disposition)

**Date:** 2026-08-26
**Gate:** `/decisions` (Gate 2)
**TBDs resolved:** TBD-19, TBD-20 (both the direction; the code is a separate build loop under TDD, gated by the same categorical re-validation that closes TBD-18)
**Surfaced by:** the TBD-18 §6 categorical re-validation — `planning/calibration/2026-08-26_context-audit-tbd-18-revalidation.md` (verdict: CLOSE NOT SATISFIED, two confirmed silent-FN vectors)
**Governing design:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` (amended by this decision — §D1, §D4, §5 table)
**Spine (inherited from the design):** a **visible false positive beats a silent false negative**. Here a silent FN = scoring real rot as accepted (the sub-score exists to catch rot); a visible FP = flagging an accepted-layout doc as rot (still enumerated as a finding). Both resolutions below are chosen so their failure direction is the visible one, and both prefer a **structural** test over a **convention** guess.

---

## Context

TBD-18 re-based the `orphans` sub-score to score genuine-abandoned rot only, netting out four accepted-layout classes via `isAcceptedLayout` (`src/tools/context-audit/accepted-layout.ts`). The build landed (numerator-only, `stats.genuine_abandoned_count` surfaced, `orphans` still excluded from the headline weight), but the categorical re-validation found **two confirmed silent-FN vectors** in the detector basis — the exact forbidden direction of the design's spine. Both route to `/decisions` here. Neither touches the numerator-only shape, the surfacing, findings enumeration, or any weight number; both are corrections to detector *breadth/basis* inside `accepted-layout.ts` (plus a one-line exposure in `graph.ts`).

---

## TBD-19 — D1 (`isRouteToDirNested`) keys on the wrong set

### The defect (confirmed)

`isRouteToDirNested(relPath, routedDirs)` fires when a doc is nested below a routed-ancestor directory but not directly inside one. It keys on `routedDirs`. But `graph.ts` populates `routedDirs` from **three** sources, only one of which is a genuine directory-target route:

1. **file-parent additions** — a router linking the *file* `dir/file.md` adds the parent `dir` (`recordResolvedTarget`, the in-scope-doc branch and the non-doc-file branch: `routedDirs.add(parent)`).
2. **root `""`** — a routed root-level file adds `""`.
3. **directory-target routes** — a router linking the *directory* `dir/` adds `dir` **and** records it in `dirTargetsBySrc` (the directory-only-propagation basis TBD-14 added).

Design §D1's stated concept is "nested below a routed **directory-target**." Keying on the broad `routedDirs` instead makes D1 accept any doc nested below a directory that merely *contains a linked file* — silently netting genuine rot.

**Confirmed casualty:** Ghost `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` — one of the 20 canonical genuine-abandoned residuals (the MSW proof of the test-fixture caution, re-val #2 §3.2) — is D1-sole-netted because its ancestor `apps/admin` sits in `routedDirs` **only** via a root link to the file `apps/admin/README.md`. 378 nets are D1-sole; **0** are root-`""`-only, so the driver is file-parent routed-ancestor directories, not the root.

### Resolution — re-base D1 onto the directory-target set

Re-base `isRouteToDirNested` off `routedDirs` and onto the **directory-target set**: the flattened union of the `dirTargetsBySrc` values `graph.ts` already computes for reachability but does not expose. Both of D1's checks switch to the new basis — the "directly-in-a-routed-dir → not nested" guard *and* the strict-ancestor scan — so the two use one consistent set.

- **19.1 — basis:** the union of `dirTargetsBySrc` values (directories some router routed to *as a directory target*). `apps/admin` is not in it (it was never a directory route), so MSW's ancestors no longer match and MSW flips to **counted** (genuine-abandoned). The 20 genuine survive.
- **19.2 — all-source, not reached-restricted:** the union is taken over all sources, not only reached ones. Rationale: the reachability DFS already reach-restricts *direct* children (a doc directly inside a reached-source directory-target is reached and never reaches D1); D1 only ever evaluates the residual (nested) set, so the union is a structural "does this repo route to this directory" fact, independent of whether that particular route is itself reachable. This matches the pre-registered `dirTargetsBySrc` naming in the TBD-19 row and the re-validation §6.1. The design §D1 edge case (a doc *directly* inside a directory routed only by an unreached doc stays counted) is preserved unchanged: with the new basis the doc's immediate parent is a directory-target ⇒ the guard returns false ⇒ not netted ⇒ counted — same safe direction, now keyed on the correct set.
- **19.3 — exposure:** add `dirTargets: Set<string>` (the flattened union) to `GraphResult`; thread it into `AcceptedLayoutCtx` alongside `routedDirs` and `skillDirs`. `routedDirs` stays in the context for `underRoutedDir` and any other consumer — only D1's input changes. Internal only; no output-schema change.

### Why this is structural, not a new guess

The design claimed D1 "structural — no silent-FN vector." That claim was **false for the `routedDirs` implementation** precisely because `routedDirs` is polluted by file-parents. Re-basing onto `dirTargets` — the set of directories explicitly routed *as directories* — restores the structural property the design asserted. It is not a looser or a new heuristic; it is the narrower, exact set the design's own words named.

### Secondary (designed) effect, acceptable

Re-basing D1 narrower stops it *accidentally* netting some §4 named-gap docs (component-manifests, test-harness fixtures, bare `docs/**`) that happened to sit below a file-parent-routed ancestor. Those flip from netted to **counted** — which is exactly what design §4 says should happen in v1 ("counted = visible FP by construction"). So the change also brings D1 into alignment with the design's intended class boundaries, not just the MSW point-fix. All such flips are the visible-FP direction; `orphans` carries no headline weight, so there is zero score impact today. The re-validation measures the exact new `genuine_abandoned_count` per repo.

### Rejected

- **Keep `routedDirs`, special-case MSW / file-parent ancestors** — a filter bolted onto a wrong basis; per task-observer Obs 10, a definition problem is fixed by correcting the definition, not by a downstream filter.
- **Reached-source-restricted `dirTargets`** — safer still (nets less), but more machinery (expose the reached set), and not the pre-registered direction; the flat union is already structural and the residual-only evaluation makes the distinction narrow. Revisit only if re-validation shows a nested-under-unreached-directory-target silent FN (none expected).

---

## TBD-20 — D4b (`plans/` / `CHANGELOG/` segment) is a convention guess

### The defect (confirmed)

`isTightDatedArchival` nets any doc under a path segment named `plans` or `CHANGELOG` (D4b), on the *guess* that such segments are archival. Design §D4/§5 flagged D4b as the **sole** silent-FN vector and §6.2 required checking its nets individually. The re-validation did, and the guess breaks on the corpus:

- **`plans/`:** of the D4b-sole nets, **2 are live, ready-to-build PRDs** — posthog `products/desktop/docs/plans/browser-tabs.md` (`Status: ready-for-agent`) and `.../plans/skills-tab.md` (`Status: Ready to build`, last-updated 2026-06-11), both indexed by a sibling `README.md`. Netting them silently removes live docs from the rot score — the exact forbidden direction.
- **`CHANGELOG/`:** the other 32 D4b-sole nets are superset `CHANGELOG/<semver>.md` (`1.4.1.md … 6.1.0.md`) — genuine per-release version archives. Correctly not-rot, but caught by a *convention* (the directory name), not a *structural* test.

### Resolution — drop both segment rules; replace with a structural version-shaped-basename net

- **20.1 — drop `plans/`:** remove the `plans` directory-segment rule entirely. It is a confirmed silent-FN vector, and dated plan docs (`*/plans/2026-06-11_*.md`) remain covered by **D4a** (dated filename). The 2 live PRDs (non-dated basenames) correctly flip to **counted**.
- **20.2 — drop `CHANGELOG/`, replace structurally:** remove the `CHANGELOG` directory-segment rule and fold a **version-shaped basename** test into D4a. A basename that is essentially a full semantic version (e.g. `1.4.1.md`, `6.1.0.md`) is archival by structural self-evidence — the same argument D4a already makes for a dated filename ("no realistic way a live, must-be-routed doc carries a full date in its name"; a full semver basename is the same class). This keeps all 32 superset version archives netted **structurally** rather than by directory convention, and it no longer depends on the directory being named `CHANGELOG`.
- **20.3 — version-shape tightness:** the basename (minus extension) matches a full-semver shape — `^v?\d+\.\d+(\.\d+)+$`, i.e. an optional leading `v` and **≥2 dots**. `1.4.1` / `6.1.0` net; ambiguous two-part forms (`v2`, `2.0`) do **not** net (they stay counted — the safe direction). The exact regex is pinned in the build under TDD with boundary tests, and every version-shape net is checked individually in the re-validation exactly as D4b was.

### On-corpus effect (minimal and exact)

All 32 legitimate CHANGELOG version archives were already 3-component semver basenames, so they stay netted (now via the structural version-shape rule). The only docs that change disposition are the **2 live posthog PRDs**, which flip from silently-netted to counted. Net effect: exactly the two silent-FN casualties closed; no legitimate archive lost to a visible FP. D4a's dated-filename rule is unchanged.

### Rejected

- **(a) Drop D4b entirely with no replacement** — loses the 32 legitimate CHANGELOG version archives to visible FP for no reason; the version-shape test recovers them structurally at negligible cost.
- **(c) Keep D4b with a documented per-repo carve-out** — the tool ships to arbitrary repos; a corpus-specific carve-out does not generalize and re-introduces the guess.

---

## Cross-cutting

- **X.1 — one build loop.** Both fixes live in `accepted-layout.ts` (D1 basis; D4 rule) plus a one-line `dirTargets` exposure in `graph.ts`. One TDD build, one categorical re-validation.
- **X.2 — amend, do not re-author.** This decision amends the TBD-18 design (§D1 input-set, §D4 sub-rules, §5 FP/FN table). Corrective amendments to an approved design with pre-registered directions — no from-scratch brainstorm or new design doc.
- **X.3 — rule 8 (API.md): triggered MINIMALLY (class-name phrase only, no schema change).** No `outputSchema` change, no field added; D1's input set and the reconstruction identity are undocumented internals / unchanged. But D4's class semantics expand (it now nets version-shaped basenames, not only dates), so the documented class name **"tight dated-archival" → "tight dated/versioned-archival"** in API.md (lines ~81 and ~113) is updated in the **same build commit** (rule 8). "route-to-directory-nested" is unchanged. Re-read API.md against the final code at build to confirm nothing else moved.
- **X.4 — rule 2 (ledger): re-measure to confirm unchanged.** `dirTargets` is internal to `buildGraph`; no new output field, no widened `outputSchema`. The standing tool-definition cost should be unchanged (last measured 252 / ~4000), but re-measure and log in the same commit per rule-2 discipline.
- **Close condition — unchanged from design §6.** TBD-18 closes only when a categorical re-validation on the pinned nine-repo corpus (`~/dev/ba-calibration/`, run-6 pins) confirms: (1) every netted orphan is a true accepted-layout doc and all **20** genuine-abandoned survive — MSW now among the counted; (2) the D4a version-shape nets are checked individually (the successor to §6.2's D4b check). Only a passing re-validation closes TBD-18 and makes `orphans` weight-eligible (TBD-10, a separate `/decisions`).

## Non-goals (unchanged)

No threshold or weight NUMBER (rule 7). No change to candidate determination, findings enumeration, the numerator-only shape, `stats.genuine_abandoned_count`, or `routedDirs`/reachability. Not the README sample. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.

## Ratchet

If the re-validation surfaces a new residual class (e.g. a version-shape false positive, or a nested-under-unreached-directory-target silent FN), it returns **here** to `/decisions` before any further code — never a silent pass.
