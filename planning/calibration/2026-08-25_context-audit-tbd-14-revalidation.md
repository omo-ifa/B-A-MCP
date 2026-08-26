# Calibration — TBD-14 re-validation (pinned nine-repo corpus) — **CLOSE NOT SATISFIED → `/decisions`**

**Date:** 2026-08-25
**Tool state:** `main` at `4fee3ae` (TBD-14 code merged as PR #35 `fc3e493`; #36 handoff on top). `npm test` **107/107**, `tsc` clean. **Node v25.2.1.**
**Purpose:** Run design §3.4's **categorical close condition** for TBD-14 (directory-granularity reachability). This is the run that would close TBD-14. Calibration artifact — **not** the build validation folded into PR #35, and **not** the README sample.
**Verdict:** **CLOSE NOT SATISFIED.** The primary route-to-directory fix works and is verified correct (zero "should-have-been-reached" failures; 59 orphans correctly rescued). But the categorical gate fails: **162 of 1 087 residual orphans fit none of the design's §3.4 named accepted classes.** They form three coherent, structurally-uniform shapes the design did not name — runtime-convention-loaded config files, per-component metadata content, and test-fixture markdown. Per §3.4 and the ratchet, these route to `/decisions`. **TBD-14 stays Open.**

This is the mechanism working, exactly as TBD-16 run #1 did (looked clean, failed the gate on unnamed residue → `/decisions`).

---

## 0. Pinned corpus — no re-clone

Same nine clones under `~/dev/ba-calibration/`, pinned at the run-6 commits (`2026-08-24_context-audit-run-6-nine-repo-rerun.md`; unchanged since). Verified this session:

| repo | HEAD | repo | HEAD |
|---|---|---|---|
| superset | `18fc2c6` | superpowers | `b36e082` |
| posthog | `7bd2689` | caveman | `a42ef76` |
| cal.com | `176037d` | claude-mem | `e2d1df5` |
| Ghost | `0cd3280` | one-skill-to-rule-them-all | `281f134` |
| | | icm-architect | `b20fb45` |

Harness: `runContextAudit({ path })` against each clone, read-only. Nothing written into any audited repo.

---

## 1. Before / after — both fresh this session

"Before" = pre-TBD-14 tool (`92b74ed`, parent of the TBD-14 merge), built and run this session in an isolated worktree. "After" = `main` `4fee3ae`. Only variable changed is the tool. Orphan = count of `orphan` findings.

| repo | before | after | Δ | after `orphans` sub | after headline |
|---|--:|--:|--:|:--:|:--:|
| superset | 113 | 112 | −1 | 1/n113 | 62 |
| posthog | 659 | 604 | −55 | 11/n678 | 62 |
| cal.com | 175 | 170 | −5 | 22/n218 | 53 |
| Ghost | 11 | 10 | −1 | 72/n36 | 83 |
| superpowers | 61 | 61 | 0 | 0/n61 | 64 |
| caveman | 66 | 59 | −7 | 35/n91 | 67 |
| claude-mem | 61 | 61 | 0 | 0/n61 | 49 |
| one-skill-to-rule-them-all | 0 | 0 | 0 | null/n0 | null |
| icm-architect | 0 | 0 | 0 | null/n0 | 23 |
| **total** | **1 146** | **1 087** | **−59** | | |

The fix rescued **59** documents — the route-to-directory direct children the design targeted. posthog dominates (−55); caveman −7, cal.com −5, superset/Ghost −1. superpowers and claude-mem moved 0: their reached directory targets (`tests`, `docs/public`) directly contain no orphaned candidate, so directory-only propagation correctly touches nothing there.

**superset moved only −1 despite being the design's decisive motivating case.** Not a fix failure: superset's directory routes *did* resolve as reached dir-targets (`requirements`, `docs/developer_docs/components`, `superset/migrations/versions`), but its orphaned candidates sit in *sibling* `docs/**` and `CHANGELOG/**` trees — not directly inside those routed directories — so directory-only depth correctly does not reach them (they classify as dated-archival, §3, class C).

---

## 2. The correctness check — zero "should-have-been-reached" failures (the teeth)

The single most important verification: **is any orphan directly contained in a directory that was routed by a *reached* source, yet still flagged?** Such a document should have been rescued by the fix; if flagged, the implementation is wrong. Computed per repo from the live reachability state (`dirTargetsBySrc` restricted to reached sources vs. each orphan's parent directory):

**Zero across all nine repos.** Every document directly inside a reached directory-target is reachable. The three counterfactuals the build's guard tests pin (flat / full-subtree / all-`routedDirs`) are consistent with this in the wild. The fix is correct; the residue below is not a fix defect.

---

## 3. The 1 087 residuals — taxonomy against §3.4

Each residual classified against the design's named accepted classes, with three additional buckets (E/F/G) introduced **only** to expose residuals that fit no named class. Classification basis: reached-directory-targets for nesting, `SKILL.md`-sibling for convention-discovered, path shape for the rest. Spot-verified against the filesystem and router prose.

| class | count | design §3.4 status |
|---|--:|---|
| **A — route-to-directory, nested deeper** | 686 | **named accepted** — subdir of a routed dir-target, left visible by the directory-only floor |
| **B — convention-discovered (SKILL.md sibling)** | 20 | **named accepted** — files under a dir carrying `SKILL.md` |
| **C — dated-archival** | 189 | **named accepted** — `docs/**`, `**/plans/`, `CHANGELOG/**`, dated filenames |
| **D — genuine-abandoned** | 20 | **named accepted** — real unreferenced standalone docs; the signal the sub-score exists to produce |
| **E — runtime-convention config (UNNAMED)** | 34 | **fits no named class → `/decisions`** |
| **F — per-component metadata (UNNAMED)** | 110 | **fits no named class → `/decisions`** |
| **G — test-fixture markdown (UNNAMED)** | 18 | **fits no named class → `/decisions`** |
| **total** | **1 087** | |

Named accepted (A+B+C+D) = **915**. Unnamed (E+F+G) = **162 (~15%)**.

### The three unnamed shapes

**E — runtime-convention config files (34).** Markdown loaded by an *agent/tool runtime* by directory convention, not by any routing edge, and **not** under a `SKILL.md`/manifest directory (so the design's `convention-discovered` class does not reach them):
- posthog `.claude/agents/*.md` (11) + `.claude/rules/*.md` (13) — Claude Code subagent and rule definitions.
- claude-mem `WARP.md` (Warp terminal agent config) + `cursor-hooks/*.md` (7) — Cursor integration docs.
- Ghost `apps/shade/.claude/commands/shadcn-add.md` — a Claude Code slash-command definition.
- superset `.claude/projects/js-to-ts/AGENT.md` — an ad-hoc agent-project file.

**F — per-component metadata content (110).** cal.com `packages/app-store/*/DESCRIPTION.md` — one per app-store plugin, consumed by the app-store code to render each app's listing. Candidacy arises because a *document* elsewhere in `packages/app-store` makes `packages/app-store` a coverage-parent `routedDir` (not a directory-target), dragging the whole subtree into candidacy. Uniform, per-component, code-consumed — routing *style*, not rot.

**G — test-fixture markdown (18).** caveman `tests/caveman-compress/*.md` (+ `*.original.md`) (10) and Ghost `ghost/core/test/utils/fixtures/import/*.md` / `test-utils/*` (8). Test input/expected data files, never intended to be routed.

### Why E/F/G are not silently absorbed into "genuine-abandoned"

The design's raison d'être (§2) is that `orphans` must score **routing rot, not routing style**. E/F/G are *style*: every plugin ships a `DESCRIPTION.md`, every agent ships a `.claude/agents/` file, every fixture directory ships data. Flagging 162 of them at volume is precisely "scoring a routing style," the failure TBD-14 exists to reduce. Folding them into `genuine-abandoned` — "a *real unreferenced document*, correctly flagged" — would defeat the sub-score's purpose and hide the finding. Per §3.4 ("any residual fitting neither goes to `/decisions`") and the standing ratchet ("a decision the design does not settle goes to `/decisions`, not into the work"), they are surfaced, not absorbed.

Note the boundary is genuinely a design question, not a defect: under a **broad** reading of `convention-discovered` ("loaded by runtime convention rather than a routing edge"), E and F would fit it; under the **strict** reading the design's text anchors ("files under a directory that carries a `SKILL.md`/manifest"), they do not — and G fits neither reading. The design does not settle which reading governs. That unsettled boundary is the `/decisions` item.

### D — genuine-abandoned (the intended signal), verified

The 20 D residuals are plausibly-genuine standalone documents — e.g. superset `superset/mcp_service/ARCHITECTURE.md`, `PRODUCTION.md`, `db_engine_specs/METADATA_STATUS.md`, `INSTALL.md`, `UPDATING.md`; posthog `AI_POLICY.md`, `COMPROMISES.md`, `rust/capture/OUTPUTS_REFACTOR_PLAN.md`; cal.com `packages/embeds/LIFECYCLE.md`, migration guides; caveman `ANNOUNCEMENT.md`, `TRADEMARKS.md`, `*/BINARY_LICENSE.md`; claude-mem `posthog-self-driving-report.md`; Ghost `CONTEXT-MAP.md`. These are real docs not reachable from any routing root — the correct signal. (A few — `INSTALL.md`, `UPDATING.md`, `BINARY_LICENSE.md`, and superset's `.claude/projects/js-to-ts/COORDINATOR.md` sibling of the E-classed `AGENT.md` — are borderline standard-furniture or runtime-convention items; that borderline is itself part of the `/decisions` question, and does not change the gate outcome, which turns on E/F/G.)

---

## 4. Disposition — TBD-14 stays Open; new `/decisions` item

Per §3.4 the categorical gate is **not** satisfied: 162 residuals fit no named accepted class. TBD-14 does **not** close. `orphans` **stays out of TBD-10 weighting** (the exclusion is pending this correctness/scope fix, not a weighting decision).

**`/decisions` item — how does `orphans` classify runtime-convention-loaded, per-component-metadata, and test-fixture markdown?** Candidate dispositions (to be resolved-or-deferred at the gate, **not** pre-decided here):
1. **Broaden `convention-discovered`** from "`SKILL.md`/manifest sibling" to "loaded by an agent/tool runtime by directory convention" — would name E and (arguably) F. Carries its own false-negative exposure: a genuinely-abandoned file sitting under such a directory would be silenced. Weigh on error *direction* per the chain's north star.
2. **Add named accepted classes** for per-component metadata (F) and test-fixture markdown (G), leaving them visible-but-named.
3. **Change candidate determination** so these are never candidates — but `underRoutedDir` is explicitly out of TBD-14's scope (design "Deliberately skipped"); this would be its own loop.
4. **Accept them as genuine-abandoned** — rejected here as scoring style, not rot (§3), but a defensible option the gate may still choose.

Whichever is chosen, a follow-up re-validation on this same pinned corpus must show every residual classifying before TBD-14 can close.

---

## 5. Downstream (unchanged by this run)

- **TBD-10** — `orphans` remains weighting-**ineligible** until TBD-14 closes. `routing_drift` is weighting-eligible (TBD-16 lifted its null) but the NUMBER stays deferred. **`coverage` remains the sole load-bearing headline routing-layer sub-score** until TBD-14 re-validates and TBD-11 (bloat shape) lands.
- **TBD-11** — bloat-aggregation shape, authorised/unbuilt.
- **README true-sample** — still gated behind the TBD-10/11/12 numbers. Not this record.

## Non-goals

Sets no threshold or weight number (`TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched). Does not resolve the `/decisions` item. Not the README sample. Does not change candidate determination, `routedDirs`, or `coverage`.
