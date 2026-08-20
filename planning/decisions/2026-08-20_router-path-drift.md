# Decision — an unresolvable path-shaped backtick in a ROUTER doc counts as drift

**Date:** 2026-08-20
**Status:** Resolved (implementation deferred to the code pass; no numbers)
**Decider:** B&A (product owner)
**Relates to:** `routing_drift` sub-score, and the `routing_drift`-is-toothless finding in run-2.

---

## Why

`routing_drift` read 100 on every routed repo because a non-resolving **backtick** path in a router is currently **dropped as prose** (resolve-only). But routers route via backtick (the census), so a router pointing at a path that isn't there — the exact failure this tool exists to catch — is precisely what gets hidden. A router that points somewhere missing is drift, not prose.

## Decision

**In a router doc (`isRoot`), a *path-shaped* backtick span that does not resolve counts as drift** and is scored (it contributes to the `routing_drift` numerator and denominator). Non-router docs are unaffected (their backticks stay prose — the routing layer is what's scored).

### Guardrail — "path-shaped" is defined narrowly (this is the one place an unresolvable path becomes a finding)

A backtick span is path-shaped **iff** all of:

1. it **contains a `/`** OR **ends in `.md`** (case-insensitive), **and**
2. it has **no spaces**, **and**
3. it does **not start with a dash** (`-`).

Anything else in backticks stays prose. This definition is written here so the finding's scope is auditable; it also tightens the general backtick-candidate filter (adds the no-leading-dash rule) so the two stay consistent.

### Its own category, counted separately

These findings get their own category (proposed name **`routing_path_missing`**, severity `high`) so they can be **counted separately from broken markdown links** (`routing_drift` findings). Both categories feed the one `routing_drift` sub-score; the split is for reporting. The next run reports the drift count split into **broken markdown links vs. unresolvable router paths**, per repo.

### Accepted false positive (do not special-case)

**icm-architect** ships template routers whose paths intentionally point at files that don't exist yet. Under this rule it will now score **badly on drift** (its router paths are all "missing"). That is an **acceptable cost**: a template repo is a rare shape, and silently going quiet on every real broken route to protect it is the worse trade. If the rule proves noisy across repos, it is **reverted on evidence** — hence the separate category and per-repo count.

## Consequences

- New finding category `routing_path_missing` (high) in `FindingCategory` / `SEVERITY_BY_CATEGORY`; `graph.ts` emits it for non-resolving path-shaped router backticks and counts them into `refsFromRoots` + `routingDriftCount`. `src/API.md` updates same commit (rule 8).
- `resolvedRefsFromRoots` stays "resolving edges only," so the orphans empty-basis guard and the `routing_unresolved` info finding are unaffected in trigger; but a repo like icm-architect now also carries a scored `routing_drift` of ~0. No number/threshold set.

## Non-goals

- Does not change non-router backtick handling. Does not touch weights (TBD-10) or bloat (TBD-11).
