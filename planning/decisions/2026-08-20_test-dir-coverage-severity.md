# Decision — test directories are significant for coverage, at lower severity than source

**Date:** 2026-08-20
**Status:** Resolved
**Decider:** B&A (product owner)
**Relates to:** TBD-12 (coverage significance) — this resolves the *policy* question the first calibration run surfaced ("should `test/` dirs be held to the same coverage bar as `src/`?"). The threshold **numbers** (`TBD_12_MIN_FILES`, `TBD_12_SOURCE_EXTS`) stay data-blocked.

---

## Context

The first calibration run found `test/context-audit/` (11 source files, no `CONTEXT.md`, unrouted) as an uncovered significant directory. That is a *real* gap, but it is not the *same* gap as an uncovered `src/` directory: test code is frequently self-documenting through file and test names rather than needing routing prose, so an undocumented test directory is a weaker signal than an undocumented source directory.

## Decision

**Distinguish, do not exclude.** A test directory is still significant for coverage and can still produce an uncovered finding — but at a **lower severity** than a source directory.

1. An uncovered significant **source** directory → `coverage` finding, severity **`high`** (unchanged).
2. An uncovered significant **test** directory → a distinct `coverage_test` finding, severity **`medium`**.
3. **"Test directory"** is defined by path convention: the directory's path is under, or equal to, a top-level segment named `test`, `tests`, `__tests__`, or `spec` (case-insensitive). This is a heuristic, documented as such; it is not a threshold.
4. Both variants remain **behind the TBD-12 build guard** — neither fires on the default path until the significance thresholds are calibrated. The gate flag is renamed `emitCoverageFindings` (was `emitHighFindings`) to reflect that the gated output is no longer uniformly `high`.

## Consequences

- `FindingCategory` gains `coverage_test`; `SEVERITY_BY_CATEGORY` maps it to `medium`. The design doc §4 severity mapping and `src/API.md` update to record the source/test split.
- `src/TDD.md` TBD-12 row: the test/-policy sub-question is marked resolved (this record); the significance thresholds stay open, data-blocked.
- The build guard invariant is unchanged in force — the default path still emits **no** coverage finding of either severity.

## Non-goals

- This does not decide the significance **numbers** (`MIN_FILES`, source extensions) — those need more repos.
- This does not exempt any directory from scoring; a test directory still counts toward the coverage denominator and can still be "covered" (via its own `CONTEXT.md` or a routing reference).
