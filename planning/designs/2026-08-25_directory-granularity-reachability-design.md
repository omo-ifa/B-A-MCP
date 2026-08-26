# Design — directory-granularity reachability for `orphans` (TBD-14)

**A resolved routing edge to a directory makes the documents that directory *directly contains* reachable, so `orphans` stops scoring the legitimate route-to-directory convention as a broken graph.**

---

## 1. Summary

`context_audit`'s `orphans` sub-score computes reachability over **document→document** edges only. A router that routes to a **directory** — a legitimate, common convention — creates no document edge, so every document under that directory is a candidate but never reached, and orphans them all. This design propagates reachability from a resolved directory edge to the documents **directly contained** in that directory. It touches reachability/orphans in `graph.ts` only; it does not touch `coverage`, sets no number, and does not lift the `orphans`-out-of-weighting guard (that lifts only on re-validation).

## 2. Motivation

**Whose problem.** The tool's own credibility, and the developer reading its output. `orphans` currently fires false at volume on repos that route to directories — the most consequential misfire because routing-to-a-directory is a normal convention, not an edge case, and the current model penalises it maximally.

**Why now.** The authorising decision (`planning/decisions/2026-08-24_orphans-routes-to-dirs-not-docs.md`) closed the "don't fix on one repo" condition: with the `AGENTS.md` router fix landed, `orphans` fires on all four app repos, and **superset is decisive** — its 2 routers resolve 26 edges and `coverage` reads 73 (a healthy routing layer), yet **113 of 113** candidate documents orphan. The two numbers are the same routing layer read at two granularities: routing is expressed over directories, reachability is computed over documents. `orphans` is scoring a **routing style**, not rot. The cause is settled; this is the build loop the decision authorised.

**The mechanism, confirmed in the code.** Reachability is a DFS over a `doc→doc` `edges` map seeded from router docs. A resolved edge whose target is a **directory** (or a non-doc file) is recorded into `routedDirs` but produces **no** entry in `edges`. Documents under a `routedDir` are therefore *candidates* (via `underRoutedDir`) yet never *reached* — so they orphan. The fix is to make them reachable, not merely candidates.

## 3. Architecture

### 3.1 The change: directory routes propagate reachability

A document is **also** reachable if it is **directly contained in a directory that was itself the target of a resolved routing edge from a *reached* document** — i.e. once a document is reachable from a routing root, a resolved edge from it whose target *is a directory* `D` marks every in-scope document whose parent directory is `D` as reachable.

**The propagation basis is directory *targets* only — not `routedDirs`.** `routedDirs` (which `coverage` reads) is populated three ways: a directory target adds the directory itself, but a *document* or non-doc-file target adds its **parent** directory for coverage accounting. Propagating from the whole of `routedDirs` would let a routed *document* rescue its siblings (e.g. a router pointing at `src/CONTEXT.md` would mark every doc in `src/` reachable — wrong, and it would break the existing document-granular orphan behavior). Reachability therefore propagates only from **directory targets**, recorded per source document (which document routed which directory), and only from source documents that are themselves reachable. `routedDirs` is **not** changed, so `coverage` is untouched; the candidate set (`underRoutedDir`, a subtree test) is unchanged; `orphanCount` remains "candidates not reachable."

**Propagation is ROOT-RESTRICTED — it originates only from a reached document** (amended 2026-08-25, `planning/decisions/2026-08-25_tbd-14-root-restricted-dir-propagation.md`). `recordResolvedTarget` fires from both the backtick branch (routers only) **and** the markdown branch (**any** document), so an unrestricted rule would let an *abandoned, unreachable* non-root document's markdown link to a bare directory mark that directory's documents reachable — a **silent false negative** (genuine orphan rot goes unreported), the masked-rot direction this chain refuses. Restricting propagation to reached source documents makes directory-edge reachability **consistent with the document-edge DFS**, which already only expands edges from nodes in `reached`: there is then one uniform rule — *only reached nodes propagate, by either edge kind*. Mechanically this means directory propagation is **folded into the reachability traversal** rather than run as a separate flat pass, so a document's directory targets are followed exactly when (and only when) that document is reached — naturally transitive (a document reached *via* a directory route can itself propagate its own directory routes) and naturally root-restricted. The error direction, not the (small) blast radius, decides: see the decision record.

Nothing else moves. No new edge is created (so the routing DAG, `coverage`, `routedDirs`, and drift accounting are untouched); this is purely a widening of what counts as *reached*, sourced from directory-target edges of reached documents, at directory-only depth.

### 3.2 The load-bearing choice: propagation depth is **directory-only**

D2 of the authorising decision deferred *how far* a directory route propagates, because depth is where a new false-negative class is born. This design chooses **directory-only** — a routed directory makes reachable exactly the documents it **directly contains**, not those in its subdirectories — and justifies it by the error direction this whole chain has held.

| depth | false-negative exposure (the danger) | false-positive exposure (the safe error) |
|---|---|---|
| **directory-only** *(chosen)* | **none** — it only ever reaches a document the router structurally pointed at (the routed directory's own contents). It cannot silence a genuinely-abandoned document. | a document in a **subdirectory** of a routed directory stays a candidate/orphan even if the directory route morally covered it — a **visible** finding the reader can judge. |
| immediate children (one level) | **begins** — a document one level below `D` is marked reachable even if abandoned, whenever the route did not mean that substructure. | fewer nested false positives. |
| full subtree | **maximal** — a genuinely-abandoned document deep under a routed ancestor is silently marked reachable. This is precisely the **masked-rot / silent-swallow** class the entire TBD-16 chain refused. | none. |

**Why directory-only is the safe error direction.** Its only error is a *visible* false positive (a nested document still flagged, which the reader can classify), never a *silent* false negative (an abandoned document hidden). That is the same north star the routing-drift chain held from cycle 2 onward: between a false positive the user catches on sight and a false negative that is invisible by construction, a trustworthiness tool fails visible.

**Why not deeper — grounded, not assumed.** The primary class does not need depth. superset's route-to-directory targets hold their documents **directly** (`requirements/README.md`, `docs/developer_docs/components/TODO.md` sit at the top of the routed directory, not in nested trees), so directory-only reaches them without any subtree walk. Going deeper would buy nothing for the observed cause while opening the false-negative door — a generalisation past the evidence (rule 7).

**This is a design call, not a policy ruling.** The choice is *deduced* from the chain's already-established error-direction policy, not a fresh value trade for the product owner: directory-only is the deepest propagation the tool can defend without guessing about substructure, and it is sufficient for the primary class. Were directory-only to *fail* the primary class (documents nested deep under routed dirs), choosing to propagate deeper would be a genuine false-negative trade and would return to `/decisions` — but the structure shows it does not fail, so the loop settles depth as authorised.

### 3.3 The secondary class: dir-granularity does NOT resolve it, and it is not deepened to force it

The 2026-08-20 record's convention-discovered/archival question (superpowers: 18 skill-support files + 43 archival `docs/**`) folds in here. **Reasoned explicitly:** directory-only reachability does **not** resolve it.

- **Convention-discovered skill-support files** sit beside a `SKILL.md` and are loaded by the skill runtime **by directory convention**, not by any routing edge. They are typically one or more levels below the routed level (a router routes to `skills/<name>/SKILL.md` as a document, or to `skills/` as a directory whose direct children are further directories), so directory-only propagation does not reach them. Reaching them would require either a deeper propagation depth (reintroducing the §3.2 false-negative class) or a **convention-signal detector** (treat files under a directory that carries a `SKILL.md`/manifest as reachable) — which has its **own** false-negative class (it would silence a genuinely-abandoned file that happens to sit under a skill directory).
- **Dated-archival documents** (`docs/**`, `**/plans/`, dated filenames) are **never routed at all** — a router has no reason to enumerate an archive — so no reachability mechanism touches them.

**Disposition:** this loop does **not** build a convention-signal or archival detector. Instead, following the TBD-16 precedent, these buckets are **named as accepted layout classes** that the categorical re-validation expects in the residue (see §3.4). If re-validation cannot cleanly classify them, that is a separate `/decisions` item, not a silent deepening of this loop's propagation.

**Update (2026-08-26).** The re-validation (`planning/calibration/2026-08-25_context-audit-tbd-14-revalidation.md`) surfaced three convention shapes beyond the original `SKILL.md` convention-discovered bucket — runtime-config files (`.claude/**`, `WARP.md`), per-component metadata (app-store `DESCRIPTION.md`), and harness-globbed test fixtures. The `/decisions` ruling `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md` folds all of these — including the former `SKILL.md` bucket — into **one** unified accepted class, `convention/runtime-discovered (non-routed-by-design)`, with an enumerated convention list (see §3.4). A genuine human doc that merely *sits under* a test/config directory but is reached by no convention (e.g. Ghost `MSW_USAGE_GUIDE.md`) stays a `genuine-abandoned` finding — the class is keyed on convention mechanism, never on a path prefix.

### 3.4 Exit criterion — categorical gate, not a number

Stated the TBD-16 way (`2026-08-24_routing-drift-precision-design.md` §3.4): this closes on a re-validation run against the pinned nine-repo corpus under a **categorical** condition — **every residual orphaned document must be classifiable as either a genuine-abandoned document or a named accepted layout class.** Any residual fitting neither goes to `/decisions`. It is **not** a numeric precision bar (rule 7); counting is for the record, classification is the gate.

Accepted layout classes the design expects in the residue, so re-validation anticipates rather than re-diagnoses them:

- **route-to-directory (now resolved).** The primary class this loop fixes — these leave the residue.
- **route-to-directory, nested deeper.** A document in a *subdirectory* of a routed directory, left as a visible finding by the directory-only floor. Accepted as the safe-direction cost of the depth choice; a candidate for a future depth `/decisions` only if evidence shows it dominates.
- **convention/runtime-discovered (non-routed-by-design).** Files reached by a **machine convention** — a skill/agent runtime, a component registry, or a build/codegen step that discovers files by directory or naming convention — not by a router link. The boundary is an **enumerated** convention set that grows only by an explicit `/decisions` ruling (never a silent heuristic). Enumerated as of `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md`: (1) **skill discovery** — files under a `SKILL.md`/manifest directory (superpowers' skill-support files; **this subsumes the former "convention-discovered" bullet**); (2) **agent-runtime config** — `.claude/agents|rules|commands|hooks|projects/`, the analogous `.cursor/`/`.windsurf/` trees, and root files of the same kind (`WARP.md`, `.cursorrules`, `cursor-hooks/`); (3) **component-manifest content** — a per-component metadata file mandated by a contribution convention or discovered by a registry glob (app-store `DESCRIPTION.md`); (4) **test-harness fixtures** — markdown test data a harness discovers by enumerating a fixture directory, **recognized by the harness that actually enumerates the dir, never by a bare `test/` path prefix**.
- **dated-archival.** Documents under `**/plans/`, dated-filename patterns, or a `docs/**` archive — never routed by design.
- **genuine-abandoned.** A real unreferenced document under a routed directory — correctly flagged; the signal the sub-score exists to produce.

### Deliberately skipped

- **Immediate-children and full-subtree propagation depths.** Rejected in §3.2 — they add false-negative exposure the primary class does not need. Full-subtree is the masked-rot class the chain refuses.
- **A convention-discovered detector** (SKILL.md/manifest-sibling signal) and a **dated-archival detector.** Named as accepted layout classes (§3.3/§3.4), not built — each carries its own false-negative class and would need its own decision.
- **`coverage`.** Untouched. Its directory-granular basis is already correct and is not implicated (authorising record's non-goals). This loop touches reachability/orphans in `graph.ts` only.
- **Lifting `orphans` into TBD-10 weighting.** Stays excluded until this lands **and** re-validates — an exclusion pending a correctness fix, parallel to TBD-16's null, not a weighting decision. This design sets and touches **no** weight.
- **Any threshold, weight, or precision number.** `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` are not touched. TBD-10/11/12 numbers stay deferred.
- **Changing candidate determination (`underRoutedDir`), `routedDirs` population, or promoting unanchored references to edges.** Unchanged.
- **The two standing invariants remain:** never follow a symlink, never read above root (`2026-08-20_backtick-routing-edges-and-orphans-guard.md`). Directory-only propagation reads only the already-walked in-scope document set; it introduces no new traversal.
- **A repo-root directory route (a router routing to `.`/`./`) is a consistent edge, not a special case.** The directory target normalises to `""`, so directory-only propagation marks the repo's **top-level** documents reachable — parallel to how `underRoutedDir` already treats `""`. It stays on the visible-false-positive-safe side (it reaches only direct top-level docs, never a subtree) and needs no special handling; noted so the record is complete.

## 4. Decisions

From the authorising ledger (`planning/decisions/2026-08-24_orphans-routes-to-dirs-not-docs.md`), verbatim in substance:

- **D1 — the real cause is routes-to-directories-not-documents.** Reachability is document-granular while a large share of real routing is directory-granular; excluding file classes would not have fixed superset, whose orphans are ordinary source-adjacent documents under directories that *are* routed.
- **D2 — directory-granularity reachability is authorised as its own build loop**, which must settle how a resolved edge to a directory propagates reachability and how far. **The depth question was explicitly left unchosen there.** This design resolves it — as the loop was authorised to — to **directory-only** (§3.2), on the error-direction principle, as a design call rather than a new policy ruling.
- **D3 — `orphans` stays out of TBD-10 weighting** until this loop lands and re-validates; an exclusion pending a correctness fix, not a weighting decision.

Carried from the fork (`planning/decisions/2026-08-20_orphan-scope-layout-vs-rot.md`): the convention-discovered/archival buckets, **not closed** by the authorising record, are addressed here as the secondary class — reasoned as **not resolved by dir-granularity reachability**, and named as accepted layout classes rather than given a detector (§3.3).

**No decision was left open by writing this design.** The one deferred question (propagation depth) was delegated to this loop by D2 and is resolved on established principle; it did not require a new product-owner ruling.

## 5. Docs affected

Named, not diffed:

- **`src/API.md`** — the `orphans` sub-score description gains a sentence: a document directly contained in a routed directory is reachable (route-to-directory propagation), so orphans reflects routing rot rather than routing style. Updated in the **same commit as the code** (rule 8) — for the plan, not this doc.
- **`src/TDD.md`** — the TBD-14 row moves from "Open (authorised, unbuilt)" toward Resolved **only at re-validation**, not at landing; the row gains a pointer to this design and, later, to the run record.
- **`planning/Roadmap.md`** — the `context_audit` status line notes dir-granularity reachability built (and, later, re-validated).
- **A calibration record** under `planning/calibration/` — written at the re-validation session, applying the §3.4 categorical gate. Not this loop's landing; not the README sample.
- **`src/CONTEXT.md`** context-budget ledger — re-measured only if the tool description or schema changes (rule 2); this loop changes neither, so no ledger change is expected (verified by content at build time).
