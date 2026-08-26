# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `959d88e` (`calibration(context_audit): run-7 numbers snapshot — all four sub-scores shape-clean; TBD-10/11/12 advanced, TBD-18 opened (#43)`) **at the moment this file was written.** Merging this handoff advances `main` once more — **a live `git rev-parse --short HEAD` ahead of `959d88e` is expected and correct**; what would be wrong is a HEAD *behind* it.
- **#43 trunk ancestry CONFIRMED**, not trusted from the badge: `git merge-base --is-ancestor 959d88e origin/main` → exit 0 (Obs 16 applied post-merge).
- **Tests:** **112 / 112 pass, 0 fail**, `tsc --noEmit` clean. Verified on `main` at `959d88e` post-merge. **Node v25.2.1.** (run-7 changed no code — docs/tracker only — so the count is unchanged from the TBD-11 build.)
- **Open PRs: none** at write time (this session opens one further PR for this handoff doc). #43 merged (run-7 calibration) and its branch deleted (local + remote).
- Working tree clean before this write. `src/API.md` parses (4/4 JSON blocks), unchanged this session and still matches code (no code touched). No `src/ERD.md` (no database). Context-budget ledger unchanged at **252 / ~4000**. `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **The TBD-10/11/12 NUMBERS loop has NO design doc — by design.** It is a **data + `/decisions`** loop, not a code build. The calibration evidence lives in `planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md` (this session's deliverable), not a `planning/designs/` doc.
- If **TBD-18** (the new `orphans` sub-score-basis question) is resolved toward re-basing the sub-score, *that* becomes a code build and needs a design (`superpowers:brainstorming` first) — but nothing is decided yet.
- Prior loops' designs are all **built + closed**: TBD-11 `planning/designs/2026-08-26_bloat-worst-case-aggregation-design.md`, TBD-14 `2026-08-25_directory-granularity-reachability-design.md`, TBD-16 `2026-08-24_routing-drift-precision-design.md`.

---

## Decisions + TBDs

### This session — run-7: the NUMBERS moved from *data-blocked* to *decision-ready* (no number set)

**run-7** (`planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md`, PR #43) is the **first consolidated audit with all four routing-layer sub-scores measured at one shape-clean commit** (`main` after TBD-11 #41 + TBD-14 #35 + TBD-16 #26/#30). Pinned nine-repo corpus under `~/dev/ba-calibration/` at the run-6 commits (verified). **B-A-MCP not audited** (degenerate denominators). The harness re-derives every repo's `bloat` sub-score from the raw distribution (`bloatMatch` ×9) → numbers faithful to the shipped scorer.

- **TBD-11 (bloat cutoffs) — shape CONFIRMED in the wild; cutoffs assessable, still Open.** Count-domination is gone (caveman `0/n40 → 80`, posthog `0/n45 → 55`; healthy routers lifted to 100; caveman is the mid-chain-giant case in the wild). `ROUTER_TOKEN_CUTOFF=3000` is **score-neutral** in-sample (no repo's heaviest router lands in the 3 000–4 000 band) and `CHAIN_TOKEN_CUTOFF=6000` sits in a **clean natural gap** (2 211 → [gap] → 7 437) → both **data-supported / ratification-ready**. `CHAIN_DEPTH_CUTOFF=4` is **under-determined** (only posthog at depth 5; zero observations at depth 3–4). **No number set (rule 7).**
- **TBD-12 (`MIN_FILES`) — Open, now a policy call, NOT data-blocked.** `coverage.ts` is unchanged since run-6, so run-7 reproduces run-6 exactly (superpowers `coverage 100/n1` off a single **test** dir re-confirmed). The tie-breaker cuts against silently raising `MIN_FILES` (a 4-source-file uncovered dir would drop out of scope = silent FN). **No number set.**
- **TBD-10 (weights) — Open, SHARPENED; data now exists but reveals two weighting blockers.** (A) `routing_drift` is **saturated at ~100** across the corpus (near-zero variance post-TBD-16), so weighting it joint-highest just pulls headlines to 100 and dilutes the discriminating signals. (B) the `orphans` raw sub-score is **layout-dominated** — only 20 of TBD-14's 1 077 orphans are genuine-abandoned, so a low `orphans` score measures layout *style*, not rot. `coverage` and `bloat` weight cleanly. **No weight number set.**
- **TBD-18 (NEW) — `orphans` sub-score basis.** Opened by run-7 §4.2. Should the sub-score net out the TBD-14 accepted-layout classes (score rot, not style), or keep candidate-counting and bound it with a low weight? **Blocks `orphans` carrying weight in TBD-10.** Stub-and-continue: `orphans` sub-score unchanged; no code touched. Not a reopening of TBD-14 (findings are correct) — a distinct sub-score-definition question.

Gate 2 is clean: **no decision was RESOLVED this session** (rule 7 — threshold/weight NUMBERS are owner-ratified, never guessed; six calibration runs, zero numbers ever set autonomously). TBD-10/11/12 stay **STUBBED (advanced with run-7 evidence)**; TBD-18 **STUBBED (appended)**. No `planning/decisions/` record was written — reasoning for a *deferred* stub lives in the calibration doc; a decisions record is written when a number is actually resolved.

### Still deferred / blocked (unchanged)

- **TBD-2 / TBD-4 / TBD-5 / TBD-9** — packaging / notices / pricing / doc_drift scope. Open, untouched.
- **TBD-15 / TBD-17** — v1.1 `root.method` follow-ups (Open) / further router conventions (Resolved: add none in v1).

---

## Remaining work

- **The three NUMBERS are now the owner's `/decisions` call, not a data-gathering task.** Next actionable unit: bring run-7 to `/decisions` and **ratify or defer each** — TBD-11 `3000`/`6000` (ratify) + `depth` (keep 4, flagged thin); TBD-12 `MIN_FILES` (policy); TBD-10 (the two blockers, gated on TBD-18 for `orphans`). If ratified, a **small TDD build** decommissions the two `TODO: TBD-11` stubs (values numerically unchanged → `src/API.md`/ledger untouched, rule 8/2 not triggered).
- **TBD-18** — resolve the `orphans` sub-score basis before `orphans` can carry weight in TBD-10.
- **README true-sample** — still gated behind the TBD-10/11/12 numbers landing as decided values. Must be a true run.
- **`task-observer` backlog review still owed** (now **19 OPEN**, `last-review-date.txt` = `never`). This session logged **Obs 19** (validate calibration instrumentation by re-deriving the shipped metric from it — `bloatMatch` ×9). The three earlier named-not-fixed process items plus Obs 18 are in that backlog. A dedicated review session is owed (load `task-observer` `references/weekly-review.md`). Named, not actioned here.

---

## Context not in the docs

- **The calibration clones are intact at `~/dev/ba-calibration/`** at the exact run-6 commits (verified clean this session). No re-clone was needed for run-7 — this is why run-7 was executable in one session. (My first search looked under the project tree and missed them; they live under `~/dev/`.)
- **The corpus decision for the NUMBERS: the pinned nine suffice.** They are nine different authors/orgs — already a neutral, multi-author external sample; B-A-MCP (the single-author repo) is and stays excluded. The one genuinely thin spot a fresh/larger corpus would help is `CHAIN_DEPTH` (a single depth>2 observation) and TBD-10 variance — not the other cutoffs.
- **run-7's harness is faithful, and proved it.** It imports the tool's own `walk`/`buildGraph`/`countTokens` and re-derives each repo's `bloat` sub-score from the raw distribution, asserting equality with `runContextAudit`'s output (`bloatMatch: true` ×9) before any raw number was trusted. Scratch harness (not committed): session scratchpad `run7.mjs` + `run7-data.json`.
- **The house tie-breaker still governs every open number:** visible false positive over silent false negative. It is why `ROUTER_TOKEN` staying low (more findings) is safe, why raising `MIN_FILES` is *not* an obvious bump (risks silent FN), and why TBD-18's "re-base orphans" must not silently swallow genuine-abandoned rot.
- **Why no numbers were set autonomously:** rule 7 + six runs of house precedent. Claude Code resolves *shapes/policies/classifications* in-session (grounded in data + the tie-breaker) but has **never** set a threshold NUMBER — those are owner-ratified. run-7's job was to make them ready; it did.

---

## Next-session starter

> **Take run-7 to `/decisions` (Gate 2) and ratify-or-defer the three NUMBERS — the last gating work before the README true-sample.** They are no longer data-blocked; they are decision-ready and owner-deferred. **First, invoke `task-observer` at session start** (CLAUDE.md requires it), and surface that the backlog is **19 OPEN, never reviewed** (offer the review; don't gate work on it). Then read `CLAUDE.md`, this file, `src/CONTEXT.md`, `src/TDD.md` (the TBD-10 / TBD-11 / TBD-12 / **TBD-18** rows), and `planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md`. Confirm `git rev-parse HEAD` (≥ `959d88e`) and `npm test` (expect **112**) before trusting any figure. **Read the live stub constants from source** (`bloat.ts`, `coverage.ts`, `score.ts`), never from a tracker row.
>
> Run **`/decisions`** on each: **TBD-11** — ratify `ROUTER_TOKEN_CUTOFF=3000` (or 4000, score-neutral) and `CHAIN_TOKEN_CUTOFF=6000` from the run-7 distribution; rule `CHAIN_DEPTH_CUTOFF` explicitly (keep 4, flagged under-determined, or defer). **TBD-12** — resolve-or-defer `MIN_FILES` on the existing (unchanged) evidence. **TBD-18** — decide the `orphans` sub-score basis (re-base to genuine-abandoned vs. bound with a low weight); if re-basing, `superpowers:brainstorming` first — it changes what `orphans` scores. **TBD-10** — set `coverage`/`bloat` weights (ready) and decide `routing_drift` (saturated) + `orphans` (gated on TBD-18). Write each resolution's reasoning to `planning/decisions/YYYY-MM-DD_title.md` and update the `src/TDD.md` row. Keep the standing tie-breaker (visible FP over silent FN) and the ratchet (a decision the calibration does not settle goes to `/decisions`, not into the work).
>
> **When a number is ratified and code must change** (decommission the `TODO: TBD-11` stubs, or edit any constant), build under **`superpowers:test-driven-development`**, run the reviewers (**`superpowers:requesting-code-review`**), and land via **`superpowers:finishing-a-development-branch`** — **branch + PR, never direct to `main`; after any merge verify trunk ancestry with `git merge-base --is-ancestor`, never the MERGED badge (Obs 16).** `src/API.md` updates in the same commit as any tool-schema change (rule 8; note the ratified TBD-11 values are numerically unchanged, so the schema is untouched); re-measure the ledger if the surface changes (rule 2).
>
> **Housekeeping owed, its own session:** the **`task-observer` backlog review** (19 OPEN, never reviewed) carrying the three named process items + Obs 18 + this session's Obs 19.
