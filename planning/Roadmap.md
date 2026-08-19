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
1. `context_audit` — the acquisition hook. Reads the real `CLAUDE.md` / `CONTEXT.md` tree, scores routing bloat, orphan docs, drift. Well-bounded; build first.
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
