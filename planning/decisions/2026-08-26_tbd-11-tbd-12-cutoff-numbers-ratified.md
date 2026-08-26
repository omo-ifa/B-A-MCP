# Decision — TBD-11 bloat cutoffs + TBD-12 `MIN_FILES` ratified from run-7

**Date:** 2026-08-26
**Gate:** `/decisions` (Gate 2), owner-ratified (interactive).
**Evidence:** `planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md` (run-7 — the first consolidated four-sub-score audit on shape-clean `main`, pinned nine-repo corpus, B-A-MCP not audited).

---

## Decision

Ratify three of the four `context_audit` threshold NUMBERS as decided values (moving them from `TODO: TBD-XX` stubs to calibrated constants), and keep one flagged as under-determined:

- **`TBD_11_ROUTER_TOKEN_CUTOFF = 3000`** — ratified.
- **`TBD_11_CHAIN_TOKEN_CUTOFF = 6000`** — ratified.
- **`TBD_11_CHAIN_DEPTH_CUTOFF = 4`** — kept, **flagged under-determined** (not truly calibrated by the corpus).
- **`TBD_12_MIN_FILES = 5`** — ratified.

All values are numerically unchanged from their stubs — run-7 is the evidence that the stubbed numbers are the right ones, not a mandate to move them. No cutoff value changed, so no boundary tests were added and no observable behaviour changed.

## TBDs resolved

- **TBD-11** (bloat cutoffs) → **Resolved.** Shape was resolved + built earlier (#41); this ratifies the cutoff numbers. `CHAIN_DEPTH` is decided-as-kept with an explicit under-determined caveat (revisit only if a deeper corpus lands) — a decided disposition, not an open stub.
- **TBD-12** (`MIN_FILES`) → **`MIN_FILES` number resolved.** The rest of TBD-12's scope (source-vs-test significance **basis**, `SOURCE_EXTS` provisional list, the still-off coverage-finding emission) stays Open under TBD-12 as its own later loop — explicitly **not** part of this decision.

## Context

Runs 1–6 never set a threshold number (rule 7 — TBDs are stubbed, never guessed). run-6 had the data but three sub-score shapes then changed (TBD-11/14/16). run-7 is the first run with all four sub-scores at one shape-clean commit and with the raw bloat distribution dumped faithfully (the harness re-derives every repo's `bloat` sub-score from the raw numbers — `bloatMatch` ×9 — so the distribution is the shipped scorer's, not a re-implementation).

## Options considered

**`ROUTER_TOKEN_CUTOFF`:** keep 3000 · raise to 4000 · defer.
- The sub-score is worst-case, so **only each repo's heaviest router touches the score**, and no repo's heaviest router lands in the contested 3 000–4 000 band (they are 262 / 275 / 977 / 2 211 / 6 195 / 7 283 / 15 125 / 22 196). So 3000-vs-4000 is **score-neutral in-sample** — it changes only finding volume (26 breaching routers at 3000 → 16 at 4000). The reference-quality router (superpowers 2 211) is safely below; genuine bloat (8k–22k) far above.
- **Chosen: keep 3000.** Per the house tie-breaker (visible FP > silent FN), the lower cutoff — more findings — is the safe error direction, and it is score-neutral. 4000 was a defensible finding-noise alternative, declined to keep the tie-breaker default.

**`CHAIN_TOKEN_CUTOFF`:** keep 6000 · other · defer.
- Worst-chain token sums form a clean natural gap: 262 / 275 / 1 264 / 2 211 → **[gap]** → 7 437 / 10 164 / 15 125 / 31 427. 6000 sits inside the gap (superpowers/Ghost under; caveman/superset/cal.com/posthog over).
- **Chosen: keep 6000** — mid-gap, data-backed.

**`CHAIN_DEPTH_CUTOFF`:** keep 4 · defer.
- **Under-determined.** Only posthog exceeds it (depth 5); every other repo is depth 1–2; **zero observations at depth 3 or 4**, so the corpus cannot distinguish a cutoff of 3, 4, or 5. The value is safe (depth-5 routing is plausibly deep) but not calibrated.
- **Chosen: keep 4, flagged under-determined.** Deferring the number entirely was considered; keeping 4 with an explicit caveat is cleaner than leaving an active `TODO` on a value that is already reasonable and rarely exercised.

**`MIN_FILES`:** ratify 5 · raise (8–10) · weight source > test · defer.
- No new data (`coverage.ts` unchanged since run-6; run-7 == run-6). Significant-dir spread is wide and real (0/0/1/35/50/240/349/411/1 819). The sharp case — superpowers `coverage 100/n1` off a single **test** dir — argues 5 might be low.
- **Chosen: ratify 5.** Raising `MIN_FILES` would drop small-but-real uncovered directories out of scope = **silent FN**, which the house tie-breaker refuses; and the `/n` denominator already exposes thin anchors (a `100/n1` is transparently thin at a glance). "Weight source > test dirs" is a real improvement but a **separate design loop** (it changes the significance basis), explicitly not this decision.

## Rationale

Every ratified number is grounded in the run-7 distribution plus the standing tie-breaker, not in a guess or in B-A-MCP's own run. The one number the corpus cannot constrain (`CHAIN_DEPTH`) is kept but labelled honestly rather than presented as calibrated.

## Consequences

- `src/tools/context-audit/bloat.ts`: the three `// TODO: TBD-11` inline markers and the top-of-file `TODO` are decommissioned; the constants carry their ratification rationale; `CHAIN_DEPTH` carries its under-determined caveat.
- `src/tools/context-audit/coverage.ts`: `MIN_FILES` marked ratified; `SOURCE_EXTS` and the significance-basis / finding-emission concerns keep their `TODO: TBD-12` markers.
- **No value changed → no observable behaviour changed.** `context_audit` JSON schema unchanged (`bloat` is `{score,n}`, `coverage` is `{score,n}`); the context-budget ledger is unchanged (252/~4000, rule 2); no boundary tests added (there is no new boundary — the numbers did not move).
- `src/TDD.md` rows updated (TBD-11 Resolved; TBD-12 `MIN_FILES` resolved, remainder Open).
