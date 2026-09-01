# Decision — TBD-25 + TBD-26 resolved (counted-final); the `orphans:1` raise gate reframed

**Date:** 2026-09-01
**Gate:** `/decisions` (Gate 2) — a **disposition** ruling on the two remaining §4-gap items, plus a **gate-definition** amendment to TBD-10. No source code moves (same class of ruling as `2026-08-26_tbd-14-convention-runtime-class.md`: a disposition an accepted/counted class needs no code to hold).
**Feeds:** TBD-10 (the provisional `orphans:1` → final raise). This record **removes the last two mechanism blockers** and reframes what the raise is gated on.
**Inputs:** `src/TDD.md` (TBD-10, TBD-14, TBD-25, TBD-26), `planning/decisions/2026-08-28_component-manifest-detector-mechanism.md` (L12/L13 deferred these here), `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md` (Ruling 2, the MSW caution + the tie-breaker), `planning/calibration/2026-08-26_context-audit-tbd-14-revalidation-run2.md` (§3 residual census), `src/tools/context-audit/accepted-layout.ts` (detectors D1–D5).
**Tool state at ruling:** `main` `2e6c2b2`; **no code touched this trip.** `accepted-layout.ts` D1–D5 unchanged; `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` unchanged. Last verified suite: 204/204 (SESSION_HANDOFF 2026-08-28).

---

## The shared wall (why both items resolve the same way)

`context_audit` reads **no source code**. What *makes* a markdown file a test-harness fixture (a test/benchmark harness enumerates its directory) — and what separates a live `docs/**` doc from an archival one — lives in **source the tool will not read**. Every source-free proxy for either fact is **loose**: it swallows at least one genuinely-abandoned doc, which fails the house tie-breaker (**a visible false positive beats a silent false negative**).

Detector D5 (component-manifest) succeeded only because a component registry leaves a **repeating marker artifact in the file tree** — a `config.json` beside every `DESCRIPTION.md`, ≥3 sibling directories deep — visible without reading source. **Neither remaining class has an analog:**

- **Test-harness fixtures** have no repeating tree-visible marker; the marker is the test source file that globs the directory.
- **Bare-`docs/**`** has no marker at all that separates live from archival; the only tree-visible signals (a `docs/` or `plans/` path segment) are the exact directory-segment guess TBD-20 **dropped as a confirmed silent-FN vector** (live posthog PRDs under `plans/`).

TBD-25/26 were left open by the D5 loop (L12/L13) on the hope a tight source-free mechanism might later appear. This ruling records that **none is evident today**, and — because the tie-breaker already prescribes the safe state (leave counted) — that the honest disposition is not an indefinite deferral but a **counted-final** resolution.

---

## Ruling 1 — TBD-25 (test-harness fixtures): RESOLVED, counted-final

**The un-netted test-harness-fixture residual STAYS COUNTED as an accepted, bounded visible-FP.** This is the tie-breaker-final answer, not a placeholder.

- **Residual is small and partly self-netting.** The hand-classified fixture set was 17 (caveman `tests/caveman-compress/*.md` + `*.original.md`; Ghost `ghost/core/test/utils/fixtures/import/**`). The Ghost import fixtures carry a date in the filename (`…2014-12-19-…`), so detector **D4a already nets them** (`DATED_FILENAME = /\d{4}-\d{2}-\d{2}/`). The truly-un-netted remainder is the caveman compress pairs plus Ghost `test.md` / `notyaml.md` — a handful across two repos, out of 1 077 residual orphans corpus-wide.
- **Every source-free mechanism fails.** (a) A `test/` / `fixtures/` path or name prefix swallows `MSW_USAGE_GUIDE.md` — the canonical genuine-abandoned doc that sits under `apps/admin/test-utils/` — reproducing the exact Ruling-2 casualty. (b) Sibling-set uniformity (≥N similar `.md` siblings) swallows any real documentation collection. (c) Emitting co-located test-source presence from the walk (the D5 trick) still swallows MSW, whose `test-utils/` directory holds test source. The distinguishing fact — a harness enumerates the directory — is only in source.
- **Tie-breaker prescribes the state.** With no tight rule, and every loose rule swallowing a genuine doc, the class stays counted. A visible FP here is a bounded, acceptable overcount, not a silent miss.

**Rejected:** re-deferring (keeps `orphans:1` provisional indefinitely on a gate that has no achievable mechanism); building a loose detector (fails the tie-breaker by design — swallows MSW or a real doc collection).

## Ruling 2 — TBD-26 (bare-`docs/**` disposition): RESOLVED, counted-final

**Bare-`docs/**` (undated, unversioned, not nested under a routed directory-target) STAYS COUNTED. Net nothing.**

- **Counting is tie-breaker-safe *and* arguably a true positive.** An unrouted markdown doc with no date, no version shape, and no routing-known ancestor reads as exactly what the `orphans` sub-score exists to surface: a document unreachable from any router. Counting it is not a false positive at all under a strict reading — it is the signal.
- **Netting by directory segment is explicitly rejected.** A `docs/` or `plans/` path-segment net is the guess TBD-20 removed after it silently swallowed two live, ready-to-build posthog PRDs (`products/desktop/docs/plans/…`, `Status: ready-for-agent`). Re-introducing it re-opens that silent-FN vector. Dated `docs/**` files remain covered by D4a and version-shaped ones by D4b; those are structural self-evidence, not a segment guess.
- **No tight mechanism exists** to separate live from archival `docs/**` without reading content or source, and reading either would open a new false-positive class. None is built.

**Rejected:** a `docs/**`-segment archival net (the TBD-20 silent-FN vector); re-deferring (no achievable mechanism; leaves the raise blocked on a phantom gate).

---

## Consequences — the TBD-10 `orphans:1` raise gate, reframed

The `orphans:1` weight was set **provisional** (2026-08-26) and gated, as first written, on **all three §4-gap items being *mechanized*** (component-manifest + test-fixture + bare-`docs/**`). D5 mechanized the first; Rulings 1 and 2 establish that the other two have **no tight source-free mechanism** and are correctly left **counted**. The original gate is therefore **unreachable by more detectors** — it would wait forever on mechanisms that cannot exist without the tool reading source.

**The raise gate is reframed to:**

> **`orphans:1` becomes raise-eligible when all three §4-gap items have a *landed decision* (D5 mechanized; TBD-25 and TBD-26 counted-final — this record) AND a categorical corpus re-validation on the pinned nine-repo corpus measures the residual visible-FP downward bias as *bounded*.**

This is consistent with the detector spine (*visible FP beats silent FN*): the residual is a bounded, measured overcount, not an unquantified risk. It replaces "mechanize the un-mechanizable" with "measure the accepted residual and confirm it is small."

- **The raise NUMBER is still owner-ratified at an interactive `/decisions` gate (rule 7).** This record sets no number and does **not** itself raise the weight. `TBD_10_WEIGHTS` (`{routing_drift:1, coverage:3, bloat:1, orphans:1}`) and `ROUTING_LAYER_KEYS` are untouched.
- **Track B's only remaining gate before that ratification is the corpus re-validation** — a measurement (the `planning/calibration/` pattern), not a build.

---

## Ratchet note

The counted-final dispositions **preserve the ratchet**. If a genuinely tight, source-free mechanism for test-harness fixtures or bare-`docs/**` ever appears, it may net the class by an **explicit future `/decisions` ruling** — exactly as D5 was added and as L6 governs the `config.json` marker set — improving precision then. Such a future mechanism is a **precision improvement, not a raise blocker**: it no longer gates the `orphans:1` raise, because the raise now gates on the bounded-residual measurement, which a later net only shrinks. A silent heuristic widening is never permitted; the enumerated/ruled-set discipline (TBD-14) holds.

If the upcoming corpus re-validation measures the residual downward bias as **not** bounded (a materially larger un-netted residual than the census implies), the raise does not proceed on this reframe and the finding returns **here**.

---

## Status after this ruling

- **TBD-25 → Resolved** (counted-final; no detector). **TBD-26 → Resolved** (counted-final; net nothing).
- **TBD-10 stays Open** for the `orphans:1` provisional→final raise **only**, now gated on the reframed condition above (landed decisions ✓ for all three + the pending corpus re-validation). `coverage:3` / `bloat:1` / `routing_drift:1` remain final.
- **No code changed; no number set; no schema/ledger/API.md change** (rules 2 and 8 not triggered).
- **Next:** the categorical corpus re-validation on the pinned nine-repo corpus, then the owner-ratified `orphans:1` raise `/decisions`.
