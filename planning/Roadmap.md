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
1. `context_audit` — the acquisition hook. Reads the real `CLAUDE.md` / `CONTEXT.md` tree, scores routing bloat, orphan docs, drift. Well-bounded; build first. **Status (2026-08-20): built, live, registered, and in active calibration** (merged PRs #1–#11, 71/71 tests). Now **four** sub-scores (`bloat`, `orphans`, `routing_drift`, `coverage` — `broken_refs` removed). The census found real repos route via **backtick paths, not markdown links**; the parser now assesses backtick routing and router-path drift. Remaining before "done": resolve `TBD-10/11/12` threshold NUMBERS (still Open) from a broader, less single-author sample. **Update (2026-08-21):** run-5 of the four approved app repos exposed a **v1 correctness gap** — real multi-contributor repos route via a root `AGENTS.md` (with `CLAUDE.md` a symlink to it) that the tool did not read. The `AGENTS.md` router-recognition fix (+ symlink-alias dedup + coverage routing-basis guard) **merged (PR #14)**. **Update (2026-08-25):** the **nine-repo re-run (run-6) is complete** (`planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md`). The fix worked — posthog went 1 → 45 routers — but run-6 found a **second v1 correctness gap**: `routing_drift`, the joint-highest-weighted sub-score, is **~17 % precise**, dominated by a base-directory over-read (router prose describing a sibling directory). That became **TBD-16**, which went through **four `/decisions` passes** and **four plan review cycles**; the implementation plan is **on `main` and cleared for execution** (`docs/superpowers/plans/2026-08-24-routing-drift-precision.md`, revision 3). Two further loops were authorised but not built: **TBD-11** bloat-aggregation shape and **TBD-14** dir-granularity reachability. **`TBD-10/11/12` NUMBERS remain Open and are now gated on TBD-16 landing + re-validation**, not merely on more repos. The README sample comes after that, and must be a true run. **No phase shift — `override_log` is still next** once `context_audit` stops moving. **Update (2026-08-25, later): TBD-16 fix BUILT and merged** (PRs #25 decision, #26 code, #27 re-validation; `main` `9b43bf0`, 98/98). Tasks 1–5 landed tier-2 location-gated unanchored references, global placeholder exclusion, and the CommonMark `<dest>` strip; a fifth ratchet trip (`<dest>` handling) was ruled and implemented mid-build. **But TBD-16 did NOT close:** the re-validation (`planning/calibration/2026-08-25_context-audit-tbd-16-revalidation.md`) reproduced the predicted headline (drift 59→28; 17/26 prose-relative fixed) yet §3.4's categorical gate FAILED — 7 of 28 residuals are FPs from three mechanisms §3.5 does not name (lexical placeholders `foo`/`...`; prose reference/citation; prose-relative under a nested router with the target outside its subtree). **TBD-16 stays Open; D2/D3 unconfirmed; a sixth `/decisions` trip is pending.** `TBD-10/11/12` numbers remain Open, still gated on TBD-16 closing. No phase shift. **Update (2026-08-25, CLOSED): TBD-16 RESOLVED.** The sixth `/decisions` trip named four accepted §3.5 FP classes and authorized two shape exclusions (`...`-ellipsis segment, bare-filename-no-path), which were built (PR #30) and re-validated in run #2 (`planning/calibration/2026-08-25_context-audit-tbd-16-revalidation-run2.md`, `main` `458fef5`, 102/102). §3.4's categorical gate SATISFIED: drift residue 28→16, all 16 classify (15 named §3.5 + 1 verified genuine broken route); the exclusions removed 12 findings, all verified prose/placeholder (zero FN). **D2/D3 confirmed** — `routing_drift` scored-real, `routing_path_missing` high. `routing_drift` is now weighting-eligible but the **`TBD-10/11/12` NUMBERS stay deferred**; `coverage` remains the sole load-bearing headline sub-score until **TBD-14** (dir-granularity reachability) and **TBD-11** (bloat-aggregation shape) land — the two authorised-but-unbuilt loops, now the next candidate work. README true-sample still gated behind those numbers. No phase shift. **Update (2026-08-25, TBD-14 in flight): directory-granularity reachability DESIGN + reviewed PLAN landed** (PR #33; `main` `95645e0`) — `planning/designs/2026-08-25_directory-granularity-reachability-design.md` + `docs/superpowers/plans/2026-08-25-directory-granularity-reachability.md`, plan reviewed live twice → CLEAN. Fixes `orphans` scoring the route-to-directory convention as broken (superset 113/113). Two settled choices: depth directory-only, origin root-restricted (propagate only from a reached doc). **Open pending execution** — TDD build from `main` (102→107) then categorical re-validation on the pinned corpus closes it; `orphans` stays out of TBD-10 weighting until then. Behind it: **TBD-11** (bloat-aggregation shape) authorised/unbuilt. `coverage` stays the sole load-bearing headline sub-score until TBD-14 + TBD-11 land. TBD-10/11/12 numbers data-blocked (external calibration repos only, never B-A-MCP's own run); README true-sample gated behind them. No phase shift. **Update (2026-08-25, TBD-14 code LANDED, still Open): directory-granularity reachability BUILT and merged** (PR #35; `main` `fc3e493`, 102→107, tsc clean). Directory-only + root-restricted propagation folded into the reachability DFS (`src/tools/context-audit/graph.ts`); reviewed CLEAN. **TBD-14 does NOT close on the build** — the **categorical re-validation** on the pinned nine-repo corpus is the only close condition and is still outstanding (its own later session). `orphans` stays out of TBD-10 weighting until re-val passes; `coverage` remains the sole load-bearing headline sub-score until TBD-14 re-validates and TBD-11 (bloat shape) lands. No phase shift. **Update (2026-08-25, TBD-14 RE-VALIDATION run — CLOSE NOT SATISFIED, stays Open):** `planning/calibration/2026-08-25_context-audit-tbd-14-revalidation.md`. The fix is verified correct (orphans 1 146 → 1 087, −59 rescued; zero should-have-been-reached failures), but §3.4's categorical gate FAILS — 162/1 087 residuals fit no named class, in three uniform shapes the design did not name (runtime-convention config e.g. `.claude/agents|rules`; per-component metadata `DESCRIPTION.md` per plugin; test-fixture markdown). A new `/decisions` item is opened (how `orphans` classifies these); TBD-14 stays Open pending its resolution + a follow-up re-validation. `orphans` stays out of TBD-10 weighting; `coverage` remains sole load-bearing. No phase shift. **Update (2026-08-26, `/decisions` ruling — no code): `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md`.** E/F/G folded into one unified accepted class `convention/runtime-discovered (non-routed-by-design)` (enumerated conventions: skill discovery, agent-runtime config, component-manifest content, test-harness fixtures); one test-dir doc stays `genuine-abandoned`. Design §3.3/§3.4 amended. TBD-14 still Open — close needs the follow-up re-validation applying these classes. No phase shift, no number.
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
