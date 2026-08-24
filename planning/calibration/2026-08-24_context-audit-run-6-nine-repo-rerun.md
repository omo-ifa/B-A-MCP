# context_audit — calibration run 6 (the nine-repo re-run, post-`AGENTS.md` fix)

**Date:** 2026-08-24
**Tool commit:** `8c4e5c8` (`main` — PR #14 merged: D1 `AGENTS.md` router recognition, D2 symlink-alias dedup, D3 `coverage` routing-basis guard)
**Tests at run time:** 76/76 pass, `tsc` clean (verified on `main` before the run, not carried forward from the handoff)
**Node:** v25.2.1 · **Token method:** `char-approx-v1` · **`calibrated`:** `false` (stubs active) · **No threshold resolved.**

The run the whole AGENTS.md build was for. Run-5 stopped calibration because **4/4 application repos routed through a root `AGENTS.md` the tool could not read**. That fix is now on `main`, so all **nine** wild repos (app 4 + census 5) are re-audited to see what moves.

> **Outcome: the fix worked, and the run produces real TBD-11 and TBD-12 data for the first time — but it does NOT unblock TBD-10.** The app repos' real routing layers are now visible (posthog goes from 1 router / 3 207 tokens to **45 routers / 155 280 tokens**). The census five are near-unchanged, confirming the fix was correctly scoped. However, a ground-truth check of the one sub-score that finally fires at volume — `routing_drift` — found it is **~83 % false positive**. TBD-10 weights cannot be set on a sub-score measuring prose. Two new precision TBDs opened (**TBD-16**, **TBD-17**); both route to `/decisions`, neither is guessed here.

---

## 0. Method — the corpus is pinned, not refreshed

The handoff said "re-clone/refresh and re-audit". **The clones were deliberately NOT refreshed.** Every repo was still at the exact commit run-5 / run-4 recorded, so this run changes **one** variable — the tool — and every delta below is attributable to the fix rather than to upstream churn. Refreshing the corpus is a separate, later run.

| Repo | HEAD (pinned, = prior run) | Repo | HEAD (pinned, = prior run) |
|---|---|---|---|
| superset | `18fc2c6` | superpowers | `b36e082` |
| posthog | `7bd2689` | caveman | `a42ef76` |
| cal.com | `176037d` | claude-mem | `e2d1df5` |
| Ghost | `0cd3280` | one-skill-to-rule-them-all | `281f134` |
| | | icm-architect | `b20fb45` |

Harness: `runContextAudit({ path })` called directly against each clone, read-only. Nothing was written into any audited repo.

---

## 1. Run-over-run — the four application repos (run-5 → run-6)

Run-5's figures were explicitly recorded as **artifacts**, not data (the root routing layer was invisible). They are the baseline only in the sense of "what the blind tool reported".

| Repo | headline | bloat | orphans | routing_drift | drift md/path | coverage | routing_files | routing_tokens |
|---|:--:|---|---|---|:--:|---|:--:|---:|
| **superset** | 48 → **61** | 75/n1 → **45/n2** | 1/n113 → **0/n113** | 100/n6 → **100/n26** | 0/0 → **0/0** | 3/n411 → **73/n411** | 1 → **2** | 6 195 → **10 164** |
| **posthog** | 86 → **58** | 90/n1 → **0/n45** | null/n0 → **3/n678** | null/n0 → **94/n431** | 0/0 → **2/25** | 84/n1819 → **87/n1819** | 1 → **45** | 3 207 → **155 280** |
| **cal.com** | 42 → **53** | 100/n1 → **10/n4** | null/n0 → **20/n218** | null/n0 → **100/n17** | 0/0 → **0/0** | 13/n240 → **36/n240** | 1 → **4** | 195 → **17 737** |
| **Ghost** | 79 → **82** | 80/n3 → **60/n7** | null/n0 → **69/n36** | null/n0 → **100/n34** | 0/0 → **0/0** | 79/n349 → **79/n349** | 3 → **7** | 1 512 → **3 510** |

**The fix did exactly what D1 said it would.** `routing_files` and `routing_tokens` jump on all four; the `routing_unresolved` info finding is gone from all four; `orphans` and `routing_drift` come off `null` on the three where the guards had honestly refused to score. posthog's headline **falls 86 → 58** — the run-5 86 was the "confidently wrong" case (a plausible score computed off one stray `CONTEXT.md`), and the corrected number is lower and real. That is the fix working, not a regression.

Finding-category counts (run-6): superset `{orphan:113, escapes_root:53, broken_ref:20, bloat:5}` · posthog `{orphan:659, broken_ref:79, bloat:57, escapes_root:33, routing_path_missing:25, malformed_link:2, routing_drift:2, symlink:1}` · cal.com `{orphan:175, broken_ref:32, bloat:4, escapes_root:2, symlink:2}` · Ghost `{orphan:11, symlink:17, bloat:4, escapes_root:1, malformed_link:1}`.

---

## 2. Run-over-run — the census five (run-4 → run-6)

| Repo | headline | bloat | orphans | routing_drift | drift md/path | coverage | routing_files | routing_tokens | moved? |
|---|:--:|---|---|---|:--:|---|:--:|---:|:--:|
| **superpowers** | 64 → **64** | 90/n1 → 90/n1 | 0/n61 → 0/n61 | 75/n4 → 75/n4 | 0/1 → 0/1 | 100/n1 → 100/n1 | 1 → 1 | 2 211 → 2 211 | **no** |
| **caveman** | 62 → **64** | 0/n23 → **0/n40** | 25/n105 → **27/n91** | 90/n280 → **92/n385** | 0/28 → **0/29** | 89/n35 → 89/n35 | 23 → **40** | 45 419 → **66 057** | **yes** |
| **claude-mem** | 49 → **49** | 90/n1 → 90/n1 | 0/n61 → 0/n61 | 100/n1 → 100/n1 | 0/0 → 0/0 | 0/n50 → 0/n50 | 1 → 1 | 262 → 262 | **no** |
| **one-skill-to-rule-them-all** | null → **null** | null/n0 | null/n0 | null/n0 | 0/0 | null/n0 | 0 → 0 | 0 → 0 | **no** |
| **icm-architect** | 23 → **23** | 90/n2 → 90/n2 | null/n0 | 0/n2 → 0/n2 | 0/2 → 0/2 | null/n0 | 2 → 2 | 446 → 446 | **no** |

**Only 1 of 5 moved, and the four that didn't are each explained structurally** — this is the strongest available evidence that D1/D2 are correctly scoped rather than a blanket recompute:

- **superpowers** ships `AGENTS.md` as a **symlink → `CLAUDE.md`** (the reverse of the app repos' direction). **D2 deduped it**, so the router is scored once via `CLAUDE.md` and nothing changed. The alias also no longer emits a `symlink` finding. Exactly the intended D2 behavior, observed in the wild in the reverse direction from the one it was designed against.
- **claude-mem / one-skill-to-rule-them-all** carry no `AGENTS.md` at all.
- **icm-architect** carries no `AGENTS.md`; its two routers and accepted template false positives are unchanged.
- **caveman** is the only repo carrying `AGENTS.md` files as **real, non-alias** documents (a 614 B root `AGENTS.md` alongside a separate 29 714 B `CLAUDE.md`), so it gains **17 routers and 20 638 routing tokens**.

**claude-mem's `coverage 0/n50` survives the D3 guard**, as D3 required: it has 1 router resolving ≥1 edge, so the floor-to-0 "monolithic route-nowhere" catch still fires rather than being softened to `null`. The guard did not swallow the catch it was scoped to preserve.

---

## 3. `routing_drift` — verified against the filesystem, and it does not hold up

Run-5 and every run before it recorded that **broken markdown links in routers have never fired** anywhere in the wild sample. Run-6 finally produced **2** on posthog — the first in six runs. Both were checked on disk:

```
products/desktop/packages/ui/src/features/inbox/AGENTS.md:111  -> .../inbox/chart:<chart_id>
products/signals/backend/report_generation/AGENTS.md:62        -> .../report_generation/chart:<id>
```

**Both are template placeholders** (`<chart_id>`, `<id>`), not routes. **`routing_drift` via broken markdown links still has not fired on a single genuine defect across nine repos and six runs.**

The path-shaped backtick rule (`routing_path_missing`) is where all the volume is. Every one of the 59 drift findings across the four repos that produce any was bucketed against the filesystem:

| Repo | drift findings | placeholder token | **prose-relative** (target exists deeper in the subtree) | unresolved anywhere |
|---|:--:|:--:|:--:|:--:|
| **posthog** | 27 | 5 | **17** | 5 |
| **caveman** | 29 | 5 | **9** | 15 |
| superpowers | 1 | 0 | 0 | 1 |
| icm-architect | 2 | 0 | 0 | 2 (accepted template FP) |
| **total** | **59** | **10** | **26** | **23** |

### The dominant failure mode is new and is not the caveman-28 class

**A backtick path in router prose is resolved against the router's own directory, but the prose is frequently describing a *different* directory.** posthog's `products/signals/skills/AGENTS.md` documents each scout subdirectory and says things like *"The generalist keeps one progressively-disclosed reference, `references/conventions.md`"*. The tool resolves that to `products/signals/skills/references/conventions.md` (missing) when the file being described is `products/signals/skills/signals-scout-general/references/conventions.md` — **which exists**. Verified on disk:

```
EXISTS   signals-scout-general/references/conventions.md
EXISTS   signals-scout-web-vitals/references/remediation.md
```

caveman contributes a second sub-class of the same family: **install-target paths** — router prose describing where files land in the *consumer's* repo (`.windsurf/rules/caveman.md`, `.clinerules/caveman.md`, `.github/copilot-instructions.md`, `.claude/skills/caveman-learn/SKILL.md`). Those are not routes in caveman at all.

Adding the three remaining bare-`.md`-literal artifacts (the original caveman-28 class, now also present in posthog's `products/stamphog/AGENTS.md:53`), the plausibly-genuine routing rot across the whole nine-repo sample is roughly:

| Repo | plausibly genuine | what |
|---|:--:|---|
| posthog | 3 | `browser-tabs/CONTEXT.md`, `canvas/docs/CANVAS-FREEFORM-REACT-PLAN.md`, `signals/skills/report.md` |
| caveman | ~6 | `bench/agent/README.md`, `docs/strategy/EFFICIENT_AGENT_BUILDER_SPEC.md`, `SKILL.orig.md`, `SKILL.md`, plus the 2 known cross-repo `agents/*` refs |
| superpowers | 1 | `evals/README.md` |
| icm-architect | 0 | both are the accepted template FP |
| **total** | **~10 / 59** | **precision ≈ 17 %** |

**`routing_drift` carries the joint-highest stub weight in TBD-10 (`routing_drift: 3`) and is ~83 % false positive.** Weighting it now would calibrate the headline against prose. This is the run-6 blocker, and it is the same *shape* as TBD-13 (illustrative links inflating `broken_ref`) — but scored rather than demoted to info.

**Opened as TBD-16.** Not fixed here; routes to `/decisions`. Observation 10 in the task-observer log applies directly: this reads as a **definition** problem (what counts as a route), not a filter problem. **The caveman-28 residue is now absorbed into TBD-16 with two-repo evidence** — it was never caveman-specific.

> **Resolved same day (`/decisions` 2026-08-24) — `planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md`.** Two paired interim measures follow from the ≈17 % precision measured above, and **both revert together** when the base-dir precision fix lands and is re-validated: **`routing_drift` contributes a correctness-driven `null` to the headline** (a weight of `0` was measured and rejected — it would leave hygiene-only `bloat` carrying the headline, taking icm-architect from 23 to **90**), and **`routing_path_missing` is demoted to `info`** — interim and reversible, precedent TBD-13. **This section is the standing citation for why those flags are `info`:** an `info`-level `routing_path_missing` in any run between that decision and the fix is reported-but-unscored *because of the 26 prose-relative / 10 placeholder split measured here*, not because the route is unimportant. On the fix landing it returns to `high`.

---

## 4. TBD-11 — the top-end data finally exists, and it says the shape is still wrong

`bloat` is the sub-score run-6 most changes. **First, a documentation correction:** `src/TDD.md` recorded the stub as `TBD_11_ROUTING_TOKEN_CUTOFF=4000`. That symbol **no longer exists** — the per-router reshape renamed it. Live values in `src/tools/context-audit/bloat.ts`:

```
TBD_11_ROUTER_TOKEN_CUTOFF = 3000    TBD_11_CHAIN_TOKEN_CUTOFF  = 6000
TBD_11_CHAIN_DEPTH_CUTOFF  = 4       TBD_11_INLINE_RATIO_CUTOFF = 0.85
TBD_11_INLINE_MIN_TOKENS   = 200
```

> **Do not read `TBD_11_CHAIN_TOKEN_CUTOFF = 6000` as the rejected `6000`.** The rejected number was a *flat-total routing-token* cutoff proposed to stop the tool flagging B-A-MCP's own router (tautological self-tuning). This 6000 is a *root→leaf chain sum* — a different metric. The rejection stands and is untouched.

### Finding A — `bloat` degenerates to 0 on any repo with many routers

Penalty is summed per-router across **all** routers with no normalization, so router count alone drives the score to the floor:

| Repo | routers | routing tokens | **mean tokens/router** | bloat |
|---|:--:|---:|---:|:--:|
| **posthog** | 45 | 155 280 | **3 451** | **0/n45** |
| **caveman** | 40 | 66 057 | **1 651** | **0/n40** |
| cal.com | 4 | 17 737 | 4 434 | 10/n4 |
| superset | 2 | 10 164 | 5 082 | 45/n2 |
| Ghost | 7 | 3 510 | 501 | 60/n7 |
| superpowers | 1 | 2 211 | 2 211 | 90/n1 |
| claude-mem | 1 | 262 | 262 | 90/n1 |

**caveman's mean router is 1 651 tokens — healthier per-router than superpowers' single 2 211-token router — and it scores 0 while superpowers scores 90.** superset's mean router is **3× caveman's** and it scores 45. The score is ranking router *count*, not router *bloat*. This reproduces run-2's original complaint (a flat total fails a healthy large monorepo) one level up: the metric was moved per-router, but the **aggregation** is still a flat sum. The 2026-08-20 per-router decision is only half-implemented.

### Finding B — `INLINE_RATIO_CUTOFF = 0.85` is a constant, not a discriminator

`inline_ratio` accounts for **86 of ~117** bloat findings and fires on **8 of 9** repos, including:

- `claude-mem/CLAUDE.md` — **262 tokens**, ratio 0.86. A 262-token router is the opposite of bloat.
- `superpowers/CLAUDE.md` — 2 211 tokens, ratio 0.98. The reference-quality router in the sample.
- Ghost's `apps/portal/CONTEXT.md` and `gifts/CONTEXT.md` — ratio **1.00**.

Routers are *supposed* to be mostly prose with a few paths; measuring "fraction of non-link characters" flags every well-formed router. `TBD_11_INLINE_MIN_TOKENS = 200` is also far too low — it lets a 262-token file qualify as "large enough to be inlining".

### Finding C — the size and depth metrics DO discriminate

`router_tokens > 3000` fires on **26 of 100 routers** sample-wide (posthog 18, caveman 5, superset 2, cal.com 1). `chain_depth` fired for the first time ever (**posthog, depth 5**), and `chain_tokens` gives a real spread (superset 10 164, cal.com 15 125, posthog 31 427, caveman 7 437). **These three are the metrics worth carrying weight; `inline_ratio` is the one to reconsider.** Genuine top-end datapoints now exist: posthog's root `AGENTS.md` at **9 834 tokens**, cal.com's `agents/skills/vercel-react-best-practices/AGENTS.md` at **15 125 tokens**.

**TBD-11 numbers are still NOT set here** — Findings A and B are shape defects, and setting cutoffs on top of a degenerate aggregation would bake the defect in. Fix the aggregation and re-assess `inline_ratio` first, via `/decisions`. **caveman's outsized influence remains visible:** it is again the top-end router-count case AND (with posthog) one of the two drift-residue cases.

---

## 5. TBD-12 — `MIN_FILES` now has a real spread, but one repo still dominates

Significant-directory counts at `TBD_12_MIN_FILES = 5` (the `coverage` denominator):

| Repo | significant dirs | coverage |
|---|---:|:--:|
| posthog | **1 819** | 87 |
| superset | 411 | 73 |
| Ghost | 349 | 79 |
| cal.com | 240 | 36 |
| claude-mem | 50 | **0** |
| caveman | 35 | 89 |
| superpowers | **1** | 100 |
| icm-architect / one-skill | 0 | null |

The spread run-2 called "too thin" is now genuine: **0 → 1 → 35 → 50 → 240 → 349 → 411 → 1 819**. Two observations that bear on the `MIN_FILES` number:

- **superpowers still scores `coverage 100` off a single significant directory** (`tests/brainstorm-server`, a **test** dir). Unchanged from run-4 — a headline-grade 100 resting on n=1. This is the strongest single argument that `MIN_FILES = 5` is too low, or that the significance basis must weight source dirs above test dirs.
- **posthog's 1 819 significant directories** against a 45-router layer produce `coverage 87` — the highest in the sample from the repo with by far the most surface. Whether that is a true 87 or an artifact of ancestor-coverage propagating over a very deep tree is **not** answered by this run.

**`MIN_FILES` is still not set.** The data now poses the question sharply enough to take to `/decisions`; it does not answer it.

---

## 6. Pre-flight — a third routing convention exists, and it is measured as low-yield

Per the standing rule (and task-observer obs #7), a structural pre-flight ran **before** any number was treated as data — including on repos already audited, since the fix changed what "visible" means. It surfaced three conventions the parser does not read. **All three were measured rather than assumed, and all three are low-yield — unlike `AGENTS.md`, none is a v1 STOP.**

**a. `@`-import lines (`@./path`, `@path`).** The Claude Code / Gemini CLI context-import syntax — arguably the strongest routing edge that exists, since it is a literal import. Across all nine repos, **recognized routers contain only 7 genuine `@`-import edges** (posthog `egress/AGENTS.md` → `@README.md`; `engineering_analytics/AGENTS.md` → `@SPEC.md`, `@README.md`; caveman root `AGENTS.md` → 4× `@./skills/*/SKILL.md`). Against caveman's 385 and posthog's 431 resolved router refs, 4 and 3 more edges is noise. **The parse is also hazardous:** a naive `^@` rule eats Python decorators — superset's `mcp_service/CLAUDE.md` alone carries 11 `@tool(` / `@pytest.fixture` lines inside code fences, and posthog has `@action(...)`. Any rule must exclude fenced blocks and require a path shape.

**b. `GEMINI.md` at root.** Present in 3/9. In superset it is a **symlink → `AGENTS.md`** (already deduped by D2, alongside a `GPT.md → AGENTS.md` symlink — D2 correctly suppressed both). The two real files are 92 B and 131 B and contain *only* `@`-import lines pointing at skills already routed from `CLAUDE.md`/`AGENTS.md`. **Recognizing `GEMINI.md` would add approximately zero signal.** Rule 7 and decision D7 hold: not added.

**c. `Ghost/CONTEXT-MAP.md`.** A genuine hub router (1 027 B) listing three `CONTEXT.md` files via `Path: \`…\`` backticks — but the tool **already finds all three** of those `CONTEXT.md` files directly, so recognizing the hub would add 3 edges to Ghost's 34. 1/9 repos, near-zero yield.

**Recorded as TBD-17 so the measurement survives** and a future session does not re-discover these and guess. The recommendation carried into `/decisions` is **do not add any of the three in v1** — but that is a decision, not taken here.

---

## 7. TBD status

| TBD | Status after run-6 |
|---|---|
| **TBD-10** (weights) | **Open — still blocked, for a NEW reason.** The `AGENTS.md` gate is cleared and `routing_drift` now fires at volume (n431 on posthog, n385 on caveman), but §3 shows it is ~83 % false positive. **Blocked on TBD-16.** Weighting a sub-score that measures prose would be the same error class as the rejected `6000`. |
| **TBD-11** (bloat cutoffs) | **Open — data unblocked, shape re-blocked.** Real top-end datapoints exist for the first time (posthog 45 routers / 155 280 tokens / 9 834-token root; cal.com's 15 125-token router; first-ever `chain_depth` fire). But §4 Findings A/B are shape defects — penalty aggregation degenerates to 0 on router count, and `inline_ratio` fires on 8/9. **No cutoff set.** `6000` rejection stands. |
| **TBD-12** (`MIN_FILES`) | **Open — best data yet, still not decided.** Genuine 0→1 819 spread. superpowers' `coverage 100` off **one test dir** is the sharpest argument that 5 is too low. Ready for `/decisions`; **no number set.** |
| **TBD-14** (orphan scope) | **Open — advanced.** `orphans` now fires on all four app repos (previously `null` on 3/4): posthog **659/n678**, cal.com 175/n218, superset 113/n113, Ghost 11/n36. superset's **113/113** (score 0 — every candidate orphaned while `coverage` reads 73) is a strong new layout-vs-rot case: its routers resolve 26 edges, but to *directories*, so no document is directly referenced. The layout-vs-rot separation the app sample was meant to provide now has data. Not resolved on it. |
| **TBD-15** (v1.1 `root.method`) | **Open, unchanged.** Note: `root.method` reported `claude_md` on all four app repos (they carry the `CLAUDE.md` symlink) and `git_root` on icm-architect / one-skill. The `AGENTS.md`-only mislabel case did not occur in this sample. |
| **TBD-16** (`routing_drift` precision) | **NEW — opened by this run.** See §3. Absorbs the caveman-28 residue. |
| **TBD-17** (further router conventions) | **NEW — opened by this run.** See §6. Measured low-yield; recommendation is "do not add in v1", to be decided in `/decisions`. |
| **caveman-28 drift residue** | **Closed as a standalone item — absorbed into TBD-16**, now characterized with two-repo evidence and three named sub-classes (prose-relative, install-target, bare-literal) rather than one repo's anecdote. |

**No threshold was resolved. Rule 7 intact. Nothing was calibrated against B-A-MCP's own run — B-A-MCP was not audited in this run at all.**

---

## 8. What run-7 needs

> **Update (same day, `/decisions` 2026-08-24).** Items 1–3 below have since been through the gate; they are left as written to preserve what this run recommended. Outcomes: **TBD-16** resolved as policy + shape (precision + display; correctness-null + interim `info`; base-dir fix and md-link disposition authorised as a build loop) — `2026-08-24_routing-drift-precision-and-interim-disposition.md`. **TBD-11 shape** recorded and re-work authorised, `INLINE_RATIO_CUTOFF` flagged for re-derivation, **no number** — `2026-08-24_tbd-11-bloat-aggregation-shape.md`. **TBD-17 RESOLVED** — add no new syntax in v1 — `2026-08-24_tbd-17-no-new-router-syntax-v1.md`. A fourth fork not listed below was also taken: **TBD-14**'s cause identified as routes-to-directories-not-documents, dir-granularity reachability authorised — `2026-08-24_orphans-routes-to-dirs-not-docs.md`. **TBD-10/11/12 numbers all remain deferred.**

1. **`/decisions` on TBD-16** (the drift definition) — the single blocker for TBD-10. Treat as a definition question, not a filter question.
2. **`/decisions` on TBD-11's shape** — normalize the bloat penalty (per-router or per-chain, not a flat sum over router count) and re-assess `inline_ratio` / `INLINE_MIN_TOKENS` before any cutoff number is set.
3. **`/decisions` on TBD-17** — record "do not add in v1" (or add), so it stops resurfacing.
4. **Then re-run the nine** on the same pinned commits, and only then revisit TBD-10/11/12 numbers.
5. **The README sample is still not this run.** It must be a true run, and three sub-scores are currently known-defective.
