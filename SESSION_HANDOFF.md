# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-25

- **`main` HEAD:** `9b43bf0` (`calibration(context_audit): TBD-16 re-validation — CLOSE NOT SATISFIED, sixth ratchet trip (#27)`) **at the moment this file was written.** This file cannot record the commit that contains it: merging it advances `main` once more. **A live `git rev-parse --short HEAD` ahead of `9b43bf0` is expected and correct** — what would be wrong is a HEAD *behind* it (a stale checkout).
- **Tests:** **98 / 98 pass, 0 fail**, `tsc` clean. Verified with `npm test` on `main` at `9b43bf0`. **Node v25.2.1.**
- **Open PRs: 0.** This session merged **#25** (decision), **#26** (the TBD-16 code fix), **#27** (re-validation).
- Working tree clean. Branches `fix/tbd-16-routing-drift-precision`, `decisions/2026-08-25-commonmark-dest-strip`, `calibration/2026-08-25-tbd-16-revalidation` were merged and deleted on merge.
- **The TBD-16 fix is now BUILT and on `main`** — the first `src/**/*.ts` writes in the whole design→decisions chain landed this session (Tasks 1–5).

---

## Active design doc

**`planning/designs/2026-08-24_routing-drift-precision-design.md`** — **built and merged, but its TBD (TBD-16) is NOT closed.** Amended **five** times (four before build, one mid-build). §3.2 now carries the CommonMark `<dest>` strip + narrowed markdown-branch check (amendment 2026-08-25).

Base designs, both built: `2026-08-20_agents-md-router-recognition-design.md` (PR #14), `2026-08-18_context-audit-design.md`.

---

## Decisions + TBDs

### Landed this session
- **PR #25** — `planning/decisions/2026-08-25_commonmark-dest-strip-and-partial-wrap.md` (fifth ratchet trip): the CommonMark `<dest>` strip is implemented and the markdown placeholder check narrowed to enumerated forms (option C). Amends §3.2; added plan Task 5.
- **PR #26** — the TBD-16 code fix, four commits: Task 1 (global placeholder + bare-extension exclusion), Task 2 (tier-2 **location-gated** unanchored reference — gate on `relPath`, not `isRoot`), Task 3 (exit criterion confirmed), Task 5 (the `<dest>` strip + narrowed check, **non-vacuous** T2d).
- **PR #27** — `planning/calibration/2026-08-25_context-audit-tbd-16-revalidation.md`: the re-validation run.

### TBD-16 — **still Open. Did NOT close at re-validation.**
The fix reproduced the predicted headline on the pinned nine-repo corpus — drift **59 → 28**, **17/26 prose-relative FPs fixed** (all posthog's), **9 given back** (all caveman root `CLAUDE.md`), 11 nested residuals verified not tier-2 misses — **but §3.4's categorical close condition FAILED.** Of the 28 residuals, 18 classify into named §3.5 classes and 3 are plausibly genuine broken routes, leaving **7 false positives from three mechanisms §3.5 does not name:**
- **(A) lexical placeholders** with no syntactic marker — `foo` (posthog `signals-scout-foo`), `...` ellipsis (icm `stages/01_...`).
- **(B) prose reference / citation** — a path-shaped backtick used referentially (`CONTEXT.md`, `SKILL.md`, `bench/agent/README.md`), not a route.
- **(C) prose-relative under a NESTED router, target outside its own subtree** — an ancestor (posthog canvas → `products/desktop/docs/…`) or a depth mismatch (icm `setup/questionnaire.md` vs `questionnaire.md`). Tier 2's down-only subtree bound doesn't reach these; §3.5 names only the root-located variant.

**Consequence:** `routing_drift` is **NOT** confirmed scored-real and `routing_path_missing` is **NOT** confirmed at `high` — **D2/D3 do not flip** (§3.4 gates both on this run passing). A **sixth `/decisions` trip** is the next action on TBD-16: name A/B/C as accepted §3.5 classes (with measured counts) or authorise a fix. No threshold set; the 21/28 accounted ratio is **not** a pass (rule 7).

### Other open TBDs (unchanged this session)
- **TBD-10** — sub-score → headline weight NUMBERS. Still Open, data-blocked, **gated on TBD-16 closing**. When TBD-16 does close, `routing_drift` becomes weighting-eligible but the NUMBER stays deferred; `coverage` remains the only load-bearing headline routing-layer sub-score until TBD-14 and TBD-11 land. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.
- **TBD-14** — orphans dir-granularity reachability. Authorised as its own build loop, **not built**. Candidate next code work.
- **TBD-11** — bloat-aggregation shape. Authorised, **not built**. Candidate next code work.
- **TBD-12** — coverage `MIN_FILES` / significance numbers. Open, data-blocked. Sharpened by run-6, not forked.
- **TBD-2, TBD-4, TBD-5, TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched this session.

---

## Remaining work

- **TBD-16 sixth `/decisions` trip** — the immediate next step. Rule on the three unnamed residual-FP mechanisms (A/B/C) from the re-validation record. Until then TBD-16 stays Open and D2/D3 stay unconfirmed.
- **Two authorised-but-unbuilt loops:** TBD-14 (dir-granularity reachability) and TBD-11 (bloat-aggregation shape). Each is its own design + build loop; neither is started.
- **README true-sample** — gated behind `TBD-10/11/12` NUMBERS. **Not now.** Must be a true run, produced after those numbers exist; the re-validation record is explicitly not the README sample.
- **`src/API.md`** matches the code as committed (verified: 4 JSON blocks parse; tool schema/description in `index.ts` unchanged, ledger unaffected). No `src/ERD.md` (no database). `prompts/` untouched this session, so `.claude/commands/` was **not** regenerated (rule 1 — regenerate only when a prompt changes).

---

## Context not in the docs

- **The ratchet is doing its job — read the re-validation record before touching TBD-16.** The 59→28 and 17/9 numbers look like a clean win; per-finding classification is what caught the unnamed FP mechanisms. Do not read the headline as a pass. §3.4 is categorical: every residual named or fixed, never "precision looks good."
- **Tier 2's bound is the router's OWN subtree, searched down-only by exact tail-suffix.** That is deliberate (§3.1 rejected a wider bound), but it is exactly why mechanism (C) exists: ancestor-located and depth-mismatched prose-relative targets are unreachable by design. The sixth trip must decide whether that residue is *named-accepted* or *fixed* — widening the bound was already rejected once.
- **T2d is now non-vacuous** — it asserts the drift evidence is the *stripped* inner (`docs/gone.md`), so removing the strip fails it (mutation-verified this session). If you touch the `<dest>` path, keep that guard; a green T2d under a no-op strip is the exact trap (observation 15) that hid the missing strip for four review cycles.
- **`hasPlaceholderToken` (backtick path) and `isMarkdownPlaceholder` (markdown branch) are now separate** — the markdown branch dropped the broad `/[<>{}]/` fallback that silently swallowed broken bracketed links. Don't re-merge them.

### Two pending PROCESS items — observation-review-session work, **named not fixed** (must survive this boundary)
- **The state-tagging fault.** A recorded red/green state (or a claimed observation) must carry *which code-state it was measured against*. This chain twice recorded a T2d red state against the wrong implementation state and had to re-derive it; a state assertion without a state tag is a latent transcription error. Belongs in the next observation-review session as a candidate skill/rule.
- **The `str_replace` line-wrap no-op hazard.** A single-line search-and-replace whose target text wraps across two source lines matches nothing and **silently no-ops** — the plan itself warned of this at the §3.2 comment edit. An edit that "succeeds" without changing anything is invisible. Belongs in the same review session.

(The observation log itself was not touched beyond this naming; it holds observations 1–15, with **#14** (multiset vs set diff for count reconciliation) and **#15** (a test green under two mechanisms verifies neither) added this session.)

---

## Next-session starter

> Take TBD-16 to its **sixth `/decisions` trip**. Read `CLAUDE.md`, this file, `planning/calibration/2026-08-25_context-audit-tbd-16-revalidation.md` (§2–§3), and design §3.4–§3.5. Confirm `git rev-parse HEAD` and `npm test` (expect 98) before trusting any figure.
>
> The re-validation found **7 residual false positives from three mechanisms §3.5 does not name** — (A) lexical placeholders (`foo`, `...`), (B) prose reference/citation, (C) prose-relative under a nested router with the target outside its subtree. Run `/decisions` on them: for **each** mechanism, either **name it as an accepted §3.5 class** (with its measured count from the record, the way the root-located-router class was named) **or authorise a follow-up fix loop**. Docs only in that pass — no code, no threshold number. If the ruling authorises a fix, it becomes a new plan via `superpowers:writing-plans`, built under `superpowers:test-driven-development`, reviewed with `superpowers:requesting-code-review` → `superpowers:receiving-code-review`, finished with `superpowers:finishing-a-development-branch`. **Only if every residual then classifies** does TBD-16 close: flip it Resolved in `src/TDD.md` and confirm D2/D3 together (routing_drift scored-real, routing_path_missing high). If any residual still fits neither → seventh trip, not a silent close.
>
> Ratchet standing: no threshold number; branch + PR for anything code-touching, never direct to `main`; an unclassifiable residual is another `/decisions` trip, not a close. Two authorised-but-unbuilt loops wait behind this: **TBD-14** (dir-granularity reachability) and **TBD-11** (bloat-aggregation shape). The README true-sample stays gated behind TBD-10/11/12 numbers — not now.
