# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field is checked from inside the repo, never asserted. When this conflicts with claude-mem recall, this file wins. Updated at every `/handoff`.

---

## Repo state

- **This handoff branch:** `docs/handoff-2026-08-21-agents-md-build` → PR (WORKFLOW rule: no direct commits to `main`). Written from `main` so it reaches `main` independently of the feature PR.
- **`main` HEAD:** `6a3154d` (`Merge pull request #13` — run-5 app-sample record + the AGENTS.md decision/design records + the amended headline-definite invariant). Verified with `git rev-parse`.
- **Feature branch (NOT yet merged):** `feat/agents-md-router-recognition` @ `5cf3ab4`, **PR #14 open**, 5 commits, **76/76 tests**, `tsc` clean, tracked tree clean. This is the AGENTS.md router-recognition build. **The next session should MERGE #14 first, then re-read `main` HEAD** — do not carry `6a3154d` forward blindly.
- **PRs merged this session:** **#13** (run-5 STOP finding + the AGENTS.md scope-call decision record + the design doc + the amended `headline-definite-when-significant-dirs` invariant). **#14 is open**, awaiting review/merge.

---

## Active design doc

- **`planning/designs/2026-08-20_agents-md-router-recognition-design.md`** — **approved and BUILT** (the build is PR #14, pending merge). Read it plus its two decision records before touching the tool again:
  - `planning/decisions/2026-08-20_agents-md-router-recognition.md` — D1 (AGENTS.md is a router), D2 (symlink-alias dedup), D3 (coverage routing-basis guard), plus the accepted `root.method` label limitation.
  - `planning/decisions/2026-08-20_headline-definite-when-significant-dirs.md` — **amended this session**: the "≥1 significant dir → never null" rule now excepts the `routing_unresolved` state (routers present, zero resolved → coverage/orphans/routing_drift all null → headline null); `root_absent` still floors to 0.
- The earlier `planning/designs/2026-08-18_context-audit-design.md` remains the tool's base design (built).

---

## Decisions + TBDs

**Resolved this session (all recorded, on `main` via #13):**
- **AGENTS.md scope call** — D1/D2/D3 resolved via `/decisions` (policy, no numbers). See the decision record above.
- **Headline-definite invariant amended** for the `routing_unresolved` state (decision record above). One ruling across design doc + both decision records (no two-documents-disagree).

**New TBD opened (lives in PR #14's `src/TDD.md`; reaches `main` only when #14 merges):**
- **TBD-15** — `context_audit` v1.1 AGENTS.md-only follow-ups: (a) an `AGENTS.md`-only repo reports `root.method: "claude_md"` — a distinct `agents_md` value is the clean fix; (b) an **empty** `AGENTS.md`-only root surfaces only as `routing_unresolved` (info), not `root_empty` (critical), because the `root_empty` probe matches the literal `claude.md` filename. Both share one root cause (the accepted `root.method` label limitation) and both would touch the **context-budget-frozen `index.ts`** — deferred to v1.1. Status: Open, no number. Non-blocking (behavior is non-silent: info finding + usually a null headline).

**Open — do not lose (unchanged unless noted):**
- **TBD-10 / TBD-11 / TBD-12** (weights / bloat cutoffs / `MIN_FILES`) — NUMBERS still **Open**. #14's `src/TDD.md` refresh re-gates them: the AGENTS.md fix has **landed** (in #14); the numbers are now gated on the **nine-repo re-run** only. `6000` remains rejected as tautological self-tuning. No threshold set anywhere this session (rule 7 intact).
- **TBD-14** (orphan scope) — Open; not advanced (orphans was null/artifact on the app sample). Settle before orphans carries weight in TBD-10.
- **caveman-28 drift residue** — open second pass, not decided on one repo.
- Other open TBDs (`src/TDD.md`): **TBD-2** (caveman `skills/` path-scope + commit pin), **TBD-4** (ICM paraphrase), TBD-3, TBD-5 (price), TBD-8 (launch split), **TBD-9** (`doc_drift` scope). TBD-1/6/7/13 resolved earlier.

---

## Remaining work

- **Merge PR #14** (finish via `superpowers:finishing-a-development-branch` if not already merged). Then re-read `main` HEAD.
- **The nine-repo re-run — the next calibration run (run-6).** Now that `AGENTS.md` is a recognized router, re-audit all **nine** wild repos (app 4: `apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost`; census 5: `superpowers`, `caveman`, `claude-mem`, `task-observer`/`one-skill-to-rule-them-all`, `icm-architect` — all cloned under `~/dev/ba-calibration/`). Produce the same run-over-run table (headline + four sub-scores), with the drift count split into broken markdown links vs. `routing_path_missing`. **This is what unblocks TBD-10/11/12 NUMBERS.** Never resolve a threshold off B-A-MCP's own run.
- **Then** the caveman-28 residue second pass, then the **README sample** (a **true** run, never a flattering one).
- **Then** `override_log` (Roadmap #2), `doc_drift` (TBD-9), the `.claude/commands/` generator, `npm publish` dry-run.
- **Legal (release-blocking):** `LICENSE` + `THIRD_PARTY_NOTICES.md` — TBD-1/7 resolved, but **TBD-2** (caveman path-scope + commit pin) and **TBD-4** (ICM paraphrase, the product owner's call) still gate the notices file.
- **v1.1:** TBD-15 (when `index.ts` is next unfrozen).

---

## Context not in the docs

- **The app-repo premise was FALSIFIED.** The app repos were chosen on the theory that older multi-contributor repos route via markdown links (so `routing_drift` would catch real rot). They do not: **9/9 wild repos route via backtick paths, 0 via markdown links**, and **4/4 app repos put the root routing layer in `AGENTS.md`** with `CLAUDE.md` a symlink to it. `routing_drift`-via-markdown-links has never fired across the whole sample. This is why the AGENTS.md fix was promoted to a v1 correctness fix (mirrors the census's backtick-parser-gap promotion).
- **D3 fixture precision (important for anyone editing the D3 tests):** the `routing_unresolved` headline-null test MUST use a **pure-prose router with zero path references** so `refsFromRoots === 0` and `routing_drift` is null. A path-shaped-but-missing backtick instead makes `routing_drift` score **0** (via `routing_path_missing`) and the headline **0, not null** — both honest, but only the pure-prose fixture proves the amended invariant.
- **The D3 coverage guard is SCOPED**, not bare: `routing_files > 0 && resolvedRefsFromRoots === 0` (byte-identical to the `routing_unresolved` info-finding condition in `index.ts`). `root_absent` (`routing_files === 0`) is excluded and still floors coverage to 0 — that is what holds the amended headline-definite invariant and keeps its two regression tests green.
- **`index.ts` is context-budget-frozen (rule 2).** AGENTS.md support is deliberately NOT in the tool `description` string (would add standing tokens) — it is documented in `src/API.md` only. Any change to the tool description/schema requires a budget re-measure. TBD-15's fixes touch `index.ts`, hence v1.1.
- **Process note that paid off:** the build was subagent-driven (`superpowers:subagent-driven-development`); the **plan review** (before any code) caught that the D3 guard would redden four existing coverage fixtures, so the plan migrated them (gave each router a resolving edge) before the build. Reinforced standing rule: review the PLAN against the real code, not just the finished diff.
- **caveman is still shaping two open TBDs** (TBD-11 top-end + the drift residue); keep its influence visible, never silently baked in.
- **SDD workspace** at `.superpowers/sdd/2026-08-21-agents-md-router-recognition/` (git-ignored) holds the ledger + task/review reports. **Not deleted** — the fixes are not merged yet. Delete after #14 merges (`git log` becomes the record).

---

## Next-session starter

Paste-ready prompt for the next session:

> Continue the B&A MCP `context_audit` work. Read first: `CLAUDE.md`, this `SESSION_HANDOFF.md`, `src/TDD.md` (TBD tracker), the design doc `planning/designs/2026-08-20_agents-md-router-recognition-design.md` and its two decision records (`2026-08-20_agents-md-router-recognition.md`, `2026-08-20_headline-definite-when-significant-dirs.md`), and the run-5 record `planning/calibration/2026-08-20_context-audit-run-5-appsample.md`. **Confirm `main` HEAD and `npm test` count before trusting any prior figure.**
>
> **First:** if **PR #14** (`feat/agents-md-router-recognition`, the AGENTS.md router-recognition build) is still open, review and land it using `superpowers:finishing-a-development-branch`; then re-read `main` HEAD. If it is already merged, note the new HEAD.
>
> **Then the main task — calibration run-6 (the nine-repo re-run).** Now that `AGENTS.md` is a recognized router, re-clone/refresh and re-audit all nine wild repos (app 4: `apache/superset`, `PostHog/posthog`, `calcom/cal.com`, `TryGhost/Ghost`; census 5: `superpowers`, `caveman`, `claude-mem`, `one-skill-to-rule-them-all`, `icm-architect` — under `~/dev/ba-calibration/`). Produce the same run-over-run table (headline + four sub-scores `bloat`/`orphans`/`routing_drift`/`coverage`), with the drift count split into broken markdown links vs. `routing_path_missing`. Write `planning/calibration/2026-0X-XX_context-audit-run-6-*.md`. This run is what unblocks the `TBD-10/11/12` NUMBERS.
>
> **Standing rules:** no threshold (TBD-10/11/12) resolved from B-A-MCP's own run; `6000` already rejected as tautological self-tuning; **caveman is shaping two TBDs at once — keep its influence visible**; the first post-fix run is calibration, and the README sample must be a **true** run, never a flattering one. Also open: **TBD-14** orphan scope and the **caveman-28** drift residue. If the re-run reveals a repo that routes in yet another syntax the parser doesn't see, that is a v1 correctness finding (as AGENTS.md was) — take it back through `/decisions`, not a silent guess. For any code change use `superpowers:test-driven-development`, run the code reviewers, and `superpowers:finishing-a-development-branch`; all threshold-touching work on a branch + PR (no direct commits to `main`).

---

## Open overrides

None. (All 2026-08-20/21 decisions were made by the product owner and recorded in `planning/decisions/`. TBD-15 was opened, not resolved; it carries no override.)
