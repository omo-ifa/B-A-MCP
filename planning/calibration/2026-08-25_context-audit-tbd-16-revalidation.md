# Calibration — TBD-16 `routing_drift` precision re-validation (pinned nine-repo corpus)

**Date:** 2026-08-25
**Tool state:** `main` at the merge of PR #26 (`fix/tbd-16-routing-drift-precision`) — commit `4d40be6`, `npm test` 98/98, `tsc` clean.
**Purpose:** Apply design §3.4's **categorical close condition** to decide whether TBD-16 closes. This is a calibration artifact, **not** the build validation folded into PR #26, and **not** the README sample.
**Verdict:** **CLOSE NOT SATISFIED.** TBD-16 stays **Open**. Seven of the 28 residual drift findings are false positives from mechanisms **not** named in §3.5 and are not genuine broken routes. Per §3.4 and the ratchet, this routes to `/decisions` — the **sixth** ratchet trip. `routing_drift` is **not** confirmed scored-real and `routing_path_missing` is **not** confirmed at `high`; D2/D3 do **not** flip on this run.

---

## 0. Pinned corpus — no re-clone

The corpus is pinned so the tool is the only variable. Clones under `~/dev/ba-calibration/`, verified live at the run-6 commits (carried from `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md`):

| repo | pinned commit |
|---|---|
| superset | `18fc2c6` |
| posthog | `7bd2689` |
| cal.com | `176037d` |
| Ghost | `0cd3280` |
| superpowers | `b36e082` |
| caveman | `a42ef76` |
| claude-mem | `e2d1df5` |
| one-skill-to-rule-them-all | `281f134` |
| icm-architect | `b20fb45` |

`Buddi` and `~/.claude` are **barred** from this record — correctness probes only, not calibration evidence (D4, `2026-08-24_tier-2-scope-and-placeholder-globality.md`). They contributed nothing here.

Four repos produce any `routing_drift` / `routing_path_missing`: **posthog, caveman, superpowers, icm-architect**. The other five produce none and are not tabulated.

---

## 1. Before / after (run fresh this session, same pinned clones both states)

"Before" was captured on the pre-fix tool (`main` before the branch, `1cf0c0d`); "after" on the merged fix (`4d40be6`). Both executed this session against the same clones — no number carried forward. Drift findings counted as a **multiset** (the tool legitimately emits duplicate `(category,file,line,evidence)` tuples; a set undercounts — see task-observer obs 14).

| repo | before | after | prose-relative fixed | placeholder+bare fixed |
|---|--:|--:|--:|--:|
| posthog | 27 | 4 | **17** | 6 |
| caveman | 29 | 21 | 0 | 8 |
| superpowers | 1 | 1 | 0 | 0 |
| icm-architect | 2 | 2 | 0 | 0 |
| **total** | **59** | **28** | **17** | **14** |

- **17 of 26 prose-relative false positives fixed, all posthog's** (nested routers, target present in the router's own subtree). Tier 2 working as designed.
- **9 given back, all caveman's root `CLAUDE.md`** — the §3.5 named accepted class (prose-relative under a root-located router). Confirmed below.
- **11 nested residuals verified not tier-2 misses:** for each, the exact tail path is absent from the router's own subtree, so tier 2 correctly declined. (No finding where the target exists *in the router's subtree* still drifts.)

The headline numbers reproduce the design's prediction. **They are not the gate.** §3.4 is explicit: counting is for the record; classification is the gate; a proportion is a threshold waiting to be invented (rule 7). Every residual is classified below.

---

## 2. Categorical classification of all 28 residuals

§3.4 closes TBD-16 only if **every** residual is either (a) classifiable into a §3.5-named accepted class — **install-target**, **cross-repo**, **masked-rot-under-a-nested-router** (an FN, silent, not a positive finding), **prose-relative-under-a-root-located-router** — or (b) a **verified genuine broken route**. Any finding fitting neither bounces the gate.

### Classifiable — 18 findings

| class (§3.5) | count | findings |
|---|--:|---|
| prose-relative under a **root-located** router | 10 | caveman root `CLAUDE.md` → `caveman.md`, `caveman-commit.md`, `caveman-review.md`, `caveman-stats.md`, `caveman-init.md`, `caveman/SKILL.md`, `cavecrew/SKILL.md`, `SKILL.md` (L291), `SKILL.md` (L372); superpowers root `CLAUDE.md` → `evals/README.md` |
| install-target | 6 | caveman → `.github/copilot-instructions.md` (L178, L209, L327), `.windsurf/rules/caveman.md`, `.clinerules/caveman.md`, `skills/caveman-learn/.claude/skills/caveman-learn/SKILL.md` |
| cross-repo | 2 | caveman root `CLAUDE.md` → `agents/AGENTS.md`, `agents/CLAUDE.md` |

### Plausibly genuine broken route — 3 findings (acceptable if route-intent)

Basename absent repo-wide; the router names a doc path that resolves nowhere. Consistent with a real rotted route (the tool is right):

- caveman `packages/agent/CLAUDE.md` → `packages/agent/docs/strategy/EFFICIENT_AGENT_BUILDER_SPEC.md`
- caveman `packages/cli/AGENTS.md` → `packages/cli/SKILL.orig.md`
- posthog `products/signals/skills/AGENTS.md` (L95) → `products/signals/skills/report.md`

### UNCLASSIFIABLE — 7 findings (fail the gate)

False positives from mechanisms **§3.5 does not name**, and **not** genuine broken routes (the referenced file either exists elsewhere, or is a placeholder/prose token that was never a route):

| # | finding | why it is an FP | unnamed mechanism |
|---|---|---|---|
| 1 | posthog `products/signals/skills/AGENTS.md` L73 → `signals-scout-foo/SKILL.md` | prose: *"Creating a new `signals-scout-foo/SKILL.md` directory"* — `foo` is a fill-in-the-blank | **(A) lexical placeholder** |
| 2 | icm `assets/templates/CLAUDE.md` L20 → `stages/01_.../CONTEXT.md` | the `...` is a literal ellipsis standing for the stage name | **(A) lexical placeholder** |
| 3 | posthog `.../features/browser-tabs/AGENTS.md` L16 → `CONTEXT.md` | listed as a nav-section example (`Loops`, `Recents`, `CONTEXT.md`), not a route | **(B) prose reference / citation** |
| 4 | caveman `packages/cli/CLAUDE.md` L35 → `SKILL.md` | *"pixelize … Claude Code/Codex `SKILL.md` bodies"* — a file-**type** mention, not a route | **(B) prose reference / citation** |
| 5 | caveman `engine/CLAUDE.md` L41 → `bench/agent/README.md` | a parenthetical provenance citation (`… on 2026-08-06 (bench/agent/README.md)`); `engine/bench/` does not exist | **(B) prose reference / citation** |
| 6 | posthog `.../features/canvas/AGENTS.md` L249 → `docs/CANVAS-FREEFORM-REACT-PLAN.md` | the file **exists** at `products/desktop/docs/CANVAS-FREEFORM-REACT-PLAN.md` — an **ancestor** of the router; the prose base-guess is wrong, not the path | **(C) prose-relative under a nested router, target outside the subtree** |
| 7 | icm `assets/templates/CLAUDE.md` L23 → `setup/questionnaire.md` | the file **exists** at `assets/templates/questionnaire.md`; the prose says `setup/`, so the exact tail differs | **(C) prose-relative under a nested router, target outside the subtree** |

---

## 3. The three unnamed mechanisms

Each is a distinct residual false-positive class the fix does not reach and §3.5 does not name. §3.4 requires each be **named** (accepted) or **fixed** before TBD-16 can close — a decision, not an execution judgment.

- **(A) Lexical placeholder.** A conventional fill-in token that carries **no syntactic marker** — `foo`, `bar`, a literal `...` ellipsis. §3.2's placeholder exclusion is syntactic (`<…>`, `{…}`, globs); it cannot see `foo`. Run-6 already counted `foo` in its "10 placeholder tokens," but the design's mechanism never covered the unmarked ones. **2 findings** (posthog `foo`, icm `...`).

- **(B) Prose reference / citation.** A path-shaped backtick used **referentially** — a doc citation, a nav-label example, a file-**type**/format mention — rather than as a route the router maintains. In a router doc every path-shaped backtick is currently treated as a route; these are prose. **3 findings** (`CONTEXT.md`, `SKILL.md`, `bench/agent/README.md`).

- **(C) Prose-relative under a nested router, target outside the router's own subtree.** The file **exists**, but in an **ancestor** directory (posthog canvas → `products/desktop/docs/`) or at a **different depth** than the prose's guessed base (icm `setup/questionnaire.md` vs `questionnaire.md`). Tier 2's bound is the router's **own subtree**, searched **down-only** by exact tail-suffix; it reaches neither ancestor-located files nor base-guess mismatches. §3.5 names only prose-relative **under a root-located router**; this nested-out-of-subtree variant is unnamed. **2 findings.** (Widening the bound was explicitly rejected in §3.1 — "a repo-wide search would let any router excuse any path" — so this is a genuine open question, not a knob to turn.)

---

## 4. Disposition

- **TBD-16 stays Open.** The categorical close condition is not met; seven residuals fit neither an accepted class nor a genuine broken route.
- **D2/D3 do not flip.** `routing_drift` is **not** confirmed scored-real; `routing_path_missing` is **not** confirmed at `high`. Both confirmations are gated on this run passing (§3.4), which it did not.
- **Sixth `/decisions` trip.** The three unnamed mechanisms (A/B/C) go to Gate 2 for a ruling: for each, **name it as an accepted §3.5 class** (with its measured count, as the root-located-router class was named) **or authorise a follow-up fix**. This is exactly the "unnamed mechanism hiding behind a plausible-looking number" §3.4 exists to catch — the 59→28 and 17/9 split are real, and the residue is still not fully accounted.
- **No threshold set. No number invented.** The 21/28 accounted-for ratio is **not** a pass — §3.4 forbids substituting a proportion for per-finding classification (rule 7).
- **This record is not the README sample.**

## Non-goals

Does not re-open tier-2 scope, the placeholder globality, the CommonMark `<dest>` handling, or the exit-criterion mechanism. Does not widen tier 2's subtree bound (§3.1 rejected that). Sets no threshold or weight number.
