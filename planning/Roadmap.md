# Roadmap

Phases and dependency order. Read before starting a phase or choosing the next build.

---

## Phase 1 — Free tier (local stdio server)

**Goal:** a keyless, `npx`-installable MCP server that ships the five gates as prompts and three audit tools, published to npm. Zero B&A infrastructure touched.

**Prerequisites (before any loop):**
- TBD-2 — verify each of the five bundled components' licenses from its own repo: Superpowers, caveman, claude-mem, task-observer, and icm-architect (RinDig, MIT), added as the workspace scaffolder — it generates the structure once; B&A tools govern it over time, never generate.
- TBD-1 — confirm claude-mem's Apache 2.0 NOTICE file.
- Finalize `LICENSE` and `THIRD_PARTY_NOTICES.md`.
- Set `[DATE]` targets here and in `CLAUDE.md`.

**Build order (most bounded first):**
1. `context_audit` — the acquisition hook. Reads the real `CLAUDE.md` / `CONTEXT.md` tree, scores routing bloat, orphan docs, drift. Well-bounded; build first. **Status (2026-08-20): built, live, registered, and in active calibration** (merged PRs #1–#11, 71/71 tests). Now **four** sub-scores (`bloat`, `orphans`, `routing_drift`, `coverage` — `broken_refs` removed). The census found real repos route via **backtick paths, not markdown links**; the parser now assesses backtick routing and router-path drift. Remaining before "done": resolve `TBD-10/11/12` threshold NUMBERS (still Open) from a broader, less single-author sample. **Update (2026-08-21):** run-5 of the four approved app repos exposed a **v1 correctness gap** — real multi-contributor repos route via a root `AGENTS.md` (with `CLAUDE.md` a symlink to it) that the tool did not read. The `AGENTS.md` router-recognition fix (+ symlink-alias dedup + coverage routing-basis guard) **merged (PR #14)**. **Update (2026-08-25):** the **nine-repo re-run (run-6) is complete** (`planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md`). The fix worked — posthog went 1 → 45 routers — but run-6 found a **second v1 correctness gap**: `routing_drift`, the joint-highest-weighted sub-score, is **~17 % precise**, dominated by a base-directory over-read (router prose describing a sibling directory). That became **TBD-16**, which went through **four `/decisions` passes** and **four plan review cycles**; the implementation plan is **on `main` and cleared for execution** (`docs/superpowers/plans/2026-08-24-routing-drift-precision.md`, revision 3). Two further loops were authorised but not built: **TBD-11** bloat-aggregation shape and **TBD-14** dir-granularity reachability. **`TBD-10/11/12` NUMBERS remain Open and are now gated on TBD-16 landing + re-validation**, not merely on more repos. The README sample comes after that, and must be a true run. **No phase shift — `override_log` is still next** once `context_audit` stops moving.
2. `override_log` — the differentiation hook. Largely template generation from the guidance-with-override model.
3. `doc_drift` — the retention hook. **Least bounded (TBD-9).** Parsing migrations and routes across arbitrary frameworks. If it resists, cut to Phase 2 and ship two tools — the acquisition and differentiation hooks survive.
4. Build step: generate `.claude/commands/` from `prompts/`.
5. Context-budget ledger populated, verified under ~4k tokens.
6. `npm publish` dry-run clean from a fresh checkout.

**Exit:** the free tier is installable and the three (or two) tools run against a real repo.

---

## Phase 2 — Paid tier (`export_record`)

**Goal:** persist any gate or audit output as a versioned, timestamped artifact. The only authenticated call.

**Blocked on:** the site repo's consent-gated checkout being built and proven. This phase cannot start ahead of it.

**Work:**
- `export_record` client in `src/client/`.
- Cross-repo contract finalized in `Integration_Spec.md`.
- Key issuance + validation against Stripe customer metadata (site repo).
- EULA carve-out, counsel-reviewed.
- Sales-page disclosure naming each bundled component, above the buy button.

**Exit:** a keyholder can export a record; a non-keyholder is cleanly declined.

---

## Explicitly out of scope (not a phase yet)

- Remote/hosted server for non-technical operators — carries real cost (App Platform dynamic app), unlike Phase 1.
- Free-tier usage telemetry.
- Operator-facing decision tools (`build_buy_wait`, `vendor_vet`, `scope_to_estimate`).
- Any UI, design kit, or `impeccable` reintroduction.
- Marketplace listing.

---

## Launch sequencing (open — TBD-8)

Split launch (free tier now, paid when checkout lands) vs. single launch. The free tier has no dependency on the unbuilt checkout and could ship first. Not yet decided.
