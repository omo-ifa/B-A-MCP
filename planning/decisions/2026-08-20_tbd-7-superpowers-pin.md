# Decision — TBD-7: pin Superpowers to `v6.3.0` commit `b36e082`

**Date:** 2026-08-20
**Status:** Resolved
**Decider:** B&A (product owner)
**Resolves:** TBD-7 (pinned Superpowers major version — dependency stability)
**Evidence:** `planning/calibration/2026-08-20_provenance-and-routing-census.md` §1 (survey of `~/dev/ba-calibration/superpowers`)

---

## Question

Which Superpowers version does B&A pin? The bundle and the workflow both depend on Superpowers
being at a known, reproducible point — an unpinned "latest" drifts the gate behavior and the
notice block out from under the same-commit rules.

## Resolution

Pin **Superpowers `v6.3.0`**, commit **`b36e082`** (`b36e0829c6d0140e93cfef2ca599b1b07d4a7797`).
HEAD was exactly tagged `v6.3.0` at survey time. License confirmed **MIT** from the repo's own
`LICENSE` (`Copyright (c) 2025 Jesse Vincent`) and `.claude-plugin/plugin.json`
(`"license": "MIT"`) — consistent with the design doc packaging table.

**Pin the commit, not just the tag.** The commit is the immutable anchor; the tag is a
convenience that can move. This matches the pinning discipline flagged for caveman (where
`package.json` version and git tag disagree) — commit is always the source of truth.

## Consequence

- `Integration_Spec.md` §2 (bundled components) and the `THIRD_PARTY_NOTICES.md` Superpowers block
  record `v6.3.0` / `b36e082`, MIT, `Copyright (c) 2025 Jesse Vincent`, upstream
  `github.com/obra/superpowers`, unmodified. Same-commit rule 4 applies when the notices file is
  authored.
- TBD-7 removed from `CLAUDE.md`'s Key Open TBDs table.

## Non-goals

- Does not author the notices file or the Integration_Spec version row (those land with the
  release-blocking notices work, gated on TBD-2/TBD-4).
- Does not decide whether Superpowers is bundled vs. a runtime dependency — it is a bundled skill
  set per `Integration_Spec.md` §2; this record only fixes the pin.
