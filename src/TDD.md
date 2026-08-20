# TDD.md — Technical Design Decisions

> **TBD policy.** When you encounter a TBD reference in any document, look it up in the Master TBD Tracker below. If status is **open**: stub it, leave a `TODO: TBD-XXX` comment, and continue. **Do not guess** at the resolution. This file lives in `src/`, beside the code it binds to.

Stack and implementation conventions for this server — TypeScript ESM, `NodeNext`, `node:test`, the `index.ts`/`server.ts` split, the structured error envelope, and the context-budget ledger — live in [`src/CONTEXT.md`](CONTEXT.md). This file holds one thing: the canonical TBD tracker.

---

## Master TBD Tracker

This is the canonical TBD log. **All TBDs from all other documents resolve here.**

When a TBD is resolved:
1. Update **Status** to `Resolved` and fill in **Resolution**.
2. Record the reasoning in `planning/decisions/YYYY-MM-DD_title.md` (this tracker holds the status; the decision record holds the why).
3. Remove it from `CLAUDE.md`'s Key Open TBDs table.
4. Update any document that referenced it.
5. Build the feature that was blocked.

| TBD ID | Description | Blocks | Status | Resolution |
|---|---|---|---|---|
| TBD-1 | Does claude-mem's upstream repo ship an Apache 2.0 `NOTICE` file? | `THIRD_PARTY_NOTICES.md` — Apache 2.0 compliance | Open | |
| TBD-2 | Confirm each of the **five** bundled components' license from its own `LICENSE`/`plugin.json` (now includes `icm-architect`), not third-party listings | All packaging; `THIRD_PARTY_NOTICES.md`, `Integration_Spec.md` | Open | |
| TBD-3 | Verify DO Functions free allowance against the live console (25,000 vs 90,000 GiB-s) | Cost model only — not load-bearing | Open | |
| TBD-4 | Do B&A docs reproduce ICM (Van Clief & McDermott, 2026) expression, or paraphrase it? **Escalated:** `icm-architect` is a 905-star MIT expression of the same paper, now bundled — resolve before the notices file ships and before any copy claims the methodology as B&A-original | Publication | Open | |
| TBD-5 | Paid-tier price and structure (one-time vs. subscription) | `export_record` checkout | Open | |
| TBD-6 | Package/repo name | Everything — nothing scaffolds unnamed | **Resolved** | Repo `B-A-MCP`; npm package `b-a-mcp`. Recorded in `planning/decisions/`. |
| TBD-7 | Pinned Superpowers major version | Dependency stability | Open | |
| TBD-8 | Split launch (free tier first) or single launch? | Sequencing | Open | |
| TBD-9 | `doc_drift` scope — which frameworks and migration formats are in scope for v1 | `doc_drift` build | Open | |
| TBD-10 | `context_audit` sub-score → headline **weighting** function (accuracy cluster > bloat; N/A sub-score drops and reweights). Principle resolved; numbers only. Data-blocked — calibrate from the first dogfood run. | `context_audit` composite `score` | Open | |
| TBD-11 | `context_audit` **bloat thresholds** — routing-token-weight, inline-ratio, chain-depth cutoffs → severity. Data-blocked — calibrate from the first dogfood run. | `context_audit` `bloat` sub-score | Open | |
| TBD-12 | `context_audit` **coverage significance + thresholds** — source-vs-config classification, min file count for "significant", ancestor-coverage-within-N-hops vs own-router. Data-blocked — calibrate from the first dogfood run. **Build guard:** both the `coverage` (source, high) and `coverage_test` (test dir, medium) "uncovered significant workspace" findings must be gated behind a `TODO: TBD-12` so neither fires on uncalibrated defaults. | `context_audit` `coverage` sub-score | Open | Test-dir-vs-source **severity policy** sub-question RESOLVED — see `planning/decisions/2026-08-20_test-dir-coverage-severity.md` (test dirs stay significant but emit `coverage_test`/medium instead of `coverage`/high). The significance **threshold numbers** (`TBD_12_MIN_FILES`, `TBD_12_SOURCE_EXTS`) remain open, data-blocked. |

> **TBD policy:** If a TBD blocks implementation, stub it, leave a `TODO: TBD-XXX` comment, and continue. Do not guess. When a TBD is resolved, record the reasoning in `planning/decisions/YYYY-MM-DD_title.md`.
