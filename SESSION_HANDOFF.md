# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field is checked from inside the repo, never asserted. When this conflicts with claude-mem recall, this file wins. Updated at every `/handoff`.

---

## Repo state

- **Branch:** `main`. This handoff lands via `docs/handoff-2026-08-20-orphan-tbd` → PR (WORKFLOW rule: no direct commits to `main`).
- **Pre-handoff `main`:** `468dce1` (`468dce1429f603dae2bae80486b5e97cf789c438`). Read with `git rev-parse HEAD` at handoff time. The next session should re-read HEAD after this handoff PR merges — do not carry `468dce1` forward blindly.
- **PRs merged this session:** **#5–#11 all merged, nothing open** before this handoff PR. (#5 census, #6 TBD-1/7/4/2/13 decisions, #7 parser fix + orphans guard, #8 run-2, #9 five decision records, #10 four-sub-scores + router-path drift + per-router bloat, #11 run-4.)
- **Build/tests (verified this session on merged `main` `468dce1`):** `npm run build` clean; `npm test` → **71 pass / 0 fail**. (Not 50/50 — that figure is stale.)

---

## Active design doc

- **`planning/designs/2026-08-18_context-audit-design.md`** — **approved and built.** The tool has since been refined by a chain of decision records (all in `planning/decisions/2026-08-20_*`); read those alongside the design doc, they supersede specifics:
  - `subscore-confidence-signal` (`n`; empty denominator → null) · amended by `backtick-routing-edges-and-orphans-guard` for the zero-edge case.
  - `test-dir-coverage-severity` · `broken-refs-removed-four-subscores` · `router-path-drift` · `tbd-11-bloat-per-router-not-total` · `headline-definite-when-significant-dirs` · `orphan-scope-layout-vs-rot` (new, open).

---

## Decisions + TBDs

**Structural / policy resolved this session (NUMBERS still open — no threshold set anywhere):**
- **TBD-1** RESOLVED (claude-mem ships a `NOTICE` → reproduce it). **TBD-7** RESOLVED (Superpowers pin `v6.3.0` @ `b36e082`, commit not tag).
- **TBD-4** narrowed (icm code copyright = Van Clief; paraphrase call still owner's). **TBD-2** rescoped (caveman dual MIT+BSL-1.1; bundle `skills/caveman/` MIT, path-scope + commit-pin).
- **TBD-13** RESOLVED (policy) → **`broken_refs` REMOVED; four sub-scores** (`bloat`, `orphans`, `routing_drift`, `coverage`). Non-router broken links are `info` findings.
- **TBD-11** SHAPE resolved (bloat is per-router + per root→leaf chain, not a flat total); **cutoff NUMBERS still Open**.
- **TBD-12** test-dir severity policy resolved; **`MIN_FILES` NUMBER still Open**.

**Open — do not lose:**
- **TBD-10** (weights over the **four** sub-scores) — Open. `routing_drift` was non-discriminating until router-path drift gave it teeth; re-assess after the app-repo run. **orphans must not carry weight until TBD-14 settles** (see below).
- **TBD-11** (per-router / chain cutoff NUMBERS) — Open. `6000` for the old flat cutoff was **rejected** as tautological self-tuning against B-A-MCP's own 4619-token router. Stubs live in `src/tools/context-audit/bloat.ts`.
- **TBD-12** (`MIN_FILES` significance number) — Open. Run-4 datapoint: superpowers `coverage 100/n1` rests on a **single** test dir (`tests/brainstorm-server`) — thin, bears on `MIN_FILES`.
- **TBD-14 (NEW)** — **orphan scope**: on superpowers all 61 orphans are structural, not rot — **43 under `docs/`** (19 dated plan docs under `*/plans/`) + **18 under `skills/*/`** (convention-discovered via each `SKILL.md`). `orphans` scored a layout choice; its 0 is an artifact. Open: exclude convention-discovered/archival dirs, and how without reading source? Evidence + counts: `planning/decisions/2026-08-20_orphan-scope-layout-vs-rot.md`.
- **caveman drift residue (28)** — open second pass (bare `.md`, `AGENTS.md` cross-refs); not decided on one repo. See `planning/calibration/2026-08-20_context-audit-run-4-strict-drift.md`.
- Other open TBDs (see `src/TDD.md`): TBD-2 (five licenses / caveman path-scope), TBD-4 (ICM paraphrase), TBD-5 (price), TBD-8 (launch split), TBD-9 (`doc_drift` scope).

---

## Remaining work

- **Calibration — the next run is the big one.** Clone and audit the **four approved application repos**: `apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost` (alternate on standby: `twentyhq/twenty`). Produce the **same table format** as run-2/3/4 (headline + four sub-scores, run-over-run), with the **drift count split into broken markdown links vs. unresolvable router paths**.
- **These four are UNVALIDATED as calibration targets** — chosen from metadata (CLAUDE.md size, md-link/backtick counts, contributor history, age), **not from a run**. Any one could route in a syntax the parser doesn't see, exactly as all five census repos did. **First action on each repo is a structural pre-flight** (link-style / router census) **before its numbers are treated as data** — this session's task-observer observation **#7**.
- **Then** revisit TBD-10/11/12 NUMBERS from the fuller sample, the caveman-28 residue second pass, and only after that the README sample.
- **Next tool after calibration:** `override_log` (Roadmap #2), then `doc_drift` (TBD-9), then the `.claude/commands/` generator, then `npm publish` dry-run. Legal (release-blocking): `LICENSE` + `THIRD_PARTY_NOTICES.md` (TBD-1/7 resolved; TBD-2/TBD-4 still gate the notices file).

---

## Context not in the docs

- **Standing calibration rules (do not violate):** no threshold gets set from **B-A-MCP's own run** (its backtick routing is a degenerate self-tuning target); `6000` was already rejected as tautological self-tuning; **caveman is shaping two open TBDs at once** (TBD-11 top-end *and* the noisiest drift residue) — its influence must stay **visible**, never silently baked in; the **first post-threshold run is calibration, not the README sample**; the README sample must be a **true run, never a flattering one**.
- **Why the app-repo sample matters:** the census five are all single-author tool repos whose authors wrote the routers recently and personally — the population **least** likely to have rotted routes. The customer is someone auditing an **inherited** repo they haven't fully read. The four app repos (multi-contributor, older, churned, mixing markdown + backtick routing) are the test of whether `routing_drift` catches real rot or whether the ~1-real-catch result holds.
- **All drift signal came from the backtick rule** across all four runs — zero from broken markdown links. Reverting router-path drift would return `routing_drift` to a check structurally unable to fire.
- **Routing convention reality:** real repos route via **backtick code-span paths**, not markdown links (census: 0/5 used markdown links). Backtick edges are recognized in **router docs only**, resolve-doc-relative-OR-root-relative, resolve-only for edges; a non-resolving **strict `.md` doc-shape** router backtick is drift (`routing_path_missing`).

---

## Next-session starter

Paste-ready prompt for the next session:

> Continue `context_audit` calibration for the B&A MCP server. Read first: `CLAUDE.md`, this `SESSION_HANDOFF.md`, `src/TDD.md` (TBD tracker), the run records `planning/calibration/2026-08-20_context-audit-run-{2,4}-*.md`, and the `planning/decisions/2026-08-20_*` records (esp. `router-path-drift`, `broken-refs-removed-four-subscores`, `orphan-scope-layout-vs-rot`). The tool is at **four sub-scores** (`bloat`, `orphans`, `routing_drift`, `coverage`); confirm `main` HEAD + `npm test` count before trusting any prior figure.
>
> Task: clone and audit the four **approved, but UNVALIDATED** application repos — `apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost` (alternate: `twentyhq/twenty`). **First, a structural pre-flight per repo** (routing convention / link-style census — invoke the mindset of task-observer observation #7) before treating any repo's numbers as data — each could route in a syntax the parser doesn't see. Then run `context_audit` on each and produce the same run-over-run table (headline + four sub-scores), with the **drift count split into broken markdown links vs. `routing_path_missing`**. Write `planning/calibration/2026-0X-XX_context-audit-run-5-appsample.md`.
>
> Standing rules: **no threshold (TBD-10/11/12) resolved from B-A-MCP's own run**; `6000` already rejected as tautological self-tuning; **caveman is shaping two TBDs at once — keep its influence visible**; the first post-threshold run is calibration, and the README sample must be a **true run, never a flattering one**. Also open: **TBD-14 orphan scope** (superpowers' 61 orphans are layout, not rot — settle before orphans carries weight in TBD-10) and **caveman's 28-finding drift residue** (second pass, not on one repo). For any code change use `superpowers:test-driven-development`, run the code reviewers, and `superpowers:finishing-a-development-branch`; all threshold-touching work on a branch + PR (no direct commits to `main`).

---

## Open overrides

None. (All 2026-08-20 decisions were made by the product owner and recorded in `planning/decisions/`.)
