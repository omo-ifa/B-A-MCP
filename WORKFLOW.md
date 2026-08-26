# WORKFLOW.md

The loop and the rules for getting work into this repo. Read before any commit or PR.

---

## The loop

Five gates. Each does one job, hands a clean artifact to the next, and pauses for a human where judgment is cheapest to apply.

```
/problem-fit  → /intake     → /decisions      → /design-doc → /handoff
is AI right?    understand     resolve unknowns   write plan     close & record
(can STOP)      the problem    (resolve/defer)    (WHAT & WHY)   (verify + log)
```

- **Gate 0 · `/problem-fit`** — Runs before anything. Four questions; a low score overrides the whole engagement. Can legitimately end here.
- **Gate 1 · `/intake`** — Reads the current state first, then asks one question at a time until they dry up. Nothing written yet.
- **Gate 2 · `/decisions`** — Every open decision forced to *resolved* or *deferred* (tracked TBD with what it blocks). Nothing downstream built on a silent guess.
- **Gate 3 · `/design-doc`** — One design doc, fixed shape: motivation, approach, decisions carried over, what will change. WHAT and WHY, never the step-by-step how.
- **Gate 4 · `/handoff`** — Verify the record still matches reality, log the reasoning behind decisions and any overrides, write `SESSION_HANDOFF.md` for the next session.

**Gate mode: guidance with override.** No gate silently refuses to advance. On detecting a gap it states the specific risk, names the cheaper alternative, and — if the human proceeds anyway — logs the override rather than stopping. The override is the audit artifact.

---

## How a feature gets built

High-level planning happens on Claude web/desktop and produces a design doc + resolved decisions, carried here via `SESSION_HANDOFF.md`. Claude Code builds, using the Superpowers skills:

1. Read `SESSION_HANDOFF.md` and the design doc.
2. `superpowers:writing-plans` → chunked implementation plan; plan-document-reviewer checks it.
3. `superpowers:executing-plans` (or `subagent-driven-development`) builds under `superpowers:test-driven-development`.
4. `src/API.md` updates in the same commit as any prompt or tool-schema change.
5. Code reviewers run before finishing the branch.

Do not author plans, tests, or task breakdowns from scratch — the Superpowers skills own that. Name the skill; let Claude Code read its body.

---

## Branch & commit conventions

- **Branch per feature**, off `main`: `feat/context-audit`, `feat/doc-drift`, `fix/<slug>`.
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **Small commits** that keep the same-commit rules intact (below). A commit that changes a tool schema and the commit that updates `src/API.md` are the *same* commit.
- **No direct commits to `main`.** PR + review, even solo — the reviewer pass is the point.

---

## Same-commit rules (non-negotiable)

These bindings exist so docs can't drift from code:

1. **Prompt change → regenerate `.claude/commands/`.** `prompts/` is the source of truth. Regeneration happens at `/handoff`, not mid-task.
2. **Prompt or tool-schema change → `src/API.md`** in the same commit. The MCP surface is the public contract.
3. **Tool added or widened → context-budget ledger** in `src/CONTEXT.md`, re-measured, same commit. Standing cost stays under ~4k tokens.
4. **Bundled-component change → `THIRD_PARTY_NOTICES.md`** in the same commit (version pin, license block, modified/unmodified statement).

`/handoff` verifies all four before writing continuity.

---

## Review-derived checklists

Distilled from the first full task-observer backlog review (2026-08-26; the 20-observation log at `~/.claude/projects/<id>/skill-observations/log.md`). Each rule cites the observation it generalizes. These are project-local applications; the ones marked *(upstream)* also target read-only Superpowers skills and may be proposed there separately.

### Merge verification (Obs 16, **corrected by Obs 20**)

After any merge, confirm the change is actually on the trunk — the "MERGED" badge is not proof (a PR stacked on another PR's branch can land on that feature base, off-trunk — Obs 16). **Match the check to the merge strategy:**

- **Fast-forward / true merge:** `git merge-base --is-ancestor <branch-sha> main` (expect exit 0).
- **Squash merge:** the branch commits are DISCARDED into one new trunk commit, so `--is-ancestor <branch-sha>` **fails by design** — that is NOT a broken merge. Verify **content on trunk** instead: pull `main`, grep the changed symbols/values, confirm any new files exist, and re-run the suite on `main` so new tests execute there.
- **Never** check `git merge-base --is-ancestor <post-merge-HEAD> main` — a commit is its own ancestor, so it passes trivially and verifies nothing.

This **supersedes** any ancestry-only phrasing of the merge check. Do not reinstate "verify the branch SHA is an ancestor of main" as a universal rule — it is correct only for fast-forward/true merges.

### Commit & edit: literal text to shell-adjacent tools (Obs 21)

When handing literal text to a tool the shell or a matcher re-interprets, verify it lands literally:

- **`git commit -m`:** backticks trigger command substitution. Use `-F -` with a quoted heredoc (`<<'EOF'`), or `$(cat <<'EOF' … EOF)`; never bare backticks inside `-m "…"`.
- **Edit / `str_replace`:** an `old_string` whose whitespace or line-wrapping does not match the file byte-for-byte is a silent no-op. Match exact indentation/wrapping and confirm the tool reported a change.
- **A state/status tag written for a later matcher** (e.g. a `**Status:**` line a grep keys on): write the exact literal form the matcher expects, then read it back.

### Plan & test authoring (Obs 1, 2, 6, 9, 15, 18) *(upstream: writing-plans / TDD)*

- A task's **verification command silently defines its scope.** A file-wide `grep`/count over a single-region edit is a contradiction — scope the check to the edited region, or enumerate every region the invariant touches (Obs 1).
- Specify tests by **intent + a required-coverage checklist** (the highest-risk behavior each task must assert), not verbatim source — verbatim freezes the author's bugs and coverage blind spots behind a "use as-is" shield (Obs 2, 6).
- A fixture must make the **varying parameter actually vary** (a nested case where resolution bases differ, not only a root case where they collapse) (Obs 9).
- For any **transform-then-adjudicate** step (strip/normalize/canonicalize), add a discriminating input where the mechanism and its absence give different outputs — else a green bar certifies the outcome while the mandated mechanism is absent (Obs 15).
- When a change **removes/reshapes one contributor** to an aggregate, hand-trace which term satisfies each nearby test; a guard can pass on the soon-removed path, and a `floor()`-quantized fixture must clear a full step or the term under test is silently 0 (Obs 18).

### Calibration & measurement (Obs 7, 8, 11, 12, 14, 17, 19) — the `planning/calibration/` pattern

- **Structural pre-flight** before calibrating: verify the metric's core input assumption holds in the sample (a cheap grep) before any threshold run (Obs 7).
- **Pin the corpus** and record the pins; change one variable per run; an unmoved control is itself a result (Obs 12).
- **Verify a hoped-for positive on ground truth** before it enters a table — sample positives against the filesystem/source, report the verified fraction, never the raw count (Obs 11).
- **Localize an aggregate rate** by source before blaming a mechanism — inspect the largest cluster first (Obs 8).
- **Multiset (Counter) diff, not set diff**, when attributing a count delta for a tool that emits duplicates; reconcile the multiset total against the tool's own reported count (Obs 14).
- **Cross-foot every headline total/delta** against its itemized breakdown, computed not eyeballed; carry a machine-printed total (Obs 17).
- **Instrumentation fidelity:** any harness reproducing scorer internals must re-derive a shipped output and assert equality with the production entrypoint before its raw numbers are trusted (Obs 19).

### Code review (Obs 5)

- Flag any module that **re-implements a scope/traversal/filter another module owns** — each copy passes its own tests while the pair produces an inconsistent combined result. Prefer one shared predicate; if duplication is deliberate, cross-reference both sides and add a boundary test (Obs 5).

### Deferrals & trackers (Obs 3, 4, 10, 13) — already standing practice, restated

- A **"defer, a tool catches it later"** rationale is valid only if that tool's scope actually includes the item — name the specific behavior that flags it, else give it an owner/schedule (Obs 3).
- **Exit criteria are entry criteria** — run a build prompt's acceptance checks as an entry gate; if they already pass on the base, report done rather than manufacturing a diff (Obs 4).
- A **false-positive-dominated heuristic is usually a definition problem**, not a missing filter — tighten the definition and write it AS the definition (Obs 10).
- **Trackers point at a stub's location (file + symbol), not a copied value** — read the value from source before quoting; a copied value drifts and manufactures phantom bugs (Obs 13).

---

## Release

- Free tier publishes to npm on a **semver tag**. Nothing deploys to a server.
- `ops/CONTEXT.md` holds the release runbook.
- A release is blocked unless `LICENSE` and `THIRD_PARTY_NOTICES.md` are final (not stubs) and the notices file matches the pinned versions in `package.json`.
- `export_record` (paid tier) is a separate release, blocked on the site repo's consent-gated checkout. See `planning/Integration_Spec.md`.
