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

### The definition of a routing path (not a filter — the definition itself)

A "routing path" is one of two things:

1. **A backtick span that resolves to a real in-repo file/dir** — a route proven by existence (this is the resolve census; it needs no shape test and still counts directory and non-`.md` routes for coverage/reachability).
2. **When it does not resolve — a plain `.md` doc path by SHAPE:** it ends in `.md` (case-insensitive) and carries none of the markers that mean "not a repo doc route" — glob (`*` `{` `}`), home (`~`), env (`$`), package scope (leading `@`), whitespace, or a leading dash (`-`).

Only case 2 produces `routing_path_missing`. This is the **definition**, tightened deliberately after run-3 evidence, not a noise filter bolted on: a package scope, a shell path, an `org/repo` ref, or a glob **cannot be a doc route in any repo**, so excluding them makes the rule *sharper*, not looser. `isRoutingPathShape` in `links.ts` is the single source of this definition; the general resolve-census candidate filter stays broad (a span worth existence-checking) because a resolving span is a route regardless of shape.

**Why the earlier broad form (contains `/` OR ends `.md`) was wrong:** run-3 showed it flagged **160** non-routes on caveman — 15 globs (`skills/*/SKILL.md`), 44 `org/repo`/env/home refs (`JuliusBrussee/caveman-browse`, `$CLAUDE_CONFIG_DIR/...`, `~/.claude/...`), 101 brace-globs and external `~/` paths. None were candidate routes.

### Its own category, counted separately

These findings get their own category (proposed name **`routing_path_missing`**, severity `high`) so they can be **counted separately from broken markdown links** (`routing_drift` findings). Both categories feed the one `routing_drift` sub-score; the split is for reporting. The next run reports the drift count split into **broken markdown links vs. unresolvable router paths**, per repo.

### Accepted false positive (do not special-case)

**icm-architect** ships template routers whose paths intentionally point at files that don't exist yet. Under the strict definition it keeps **2 of its 13** run-3 findings (real template `.md`/`CONTEXT.md` paths) and scores badly on drift. That is a **known, accepted false positive on a template repo** — recorded here so it is not re-diagnosed as a bug later. A template repo is a rare shape; going quiet on every real broken route to protect it is the worse trade.

### Recorded from run-3 evidence (open, do not treat as solved)

- **Residue after the strict definition is an OPEN item**, to be recorded per-repo in the next run (run-4): the strict form reduced caveman `160 → 28`, claude-mem `5 → 0`, icm `13 → 2`, superpowers `2 → 1`, but the ~28 caveman residue (a bare `.md` literal, `AGENTS.md` cross-refs) needs a **second pass not decided on one repo's evidence**. Not blocking; not solved.
- **caveman is disproportionately shaping two open TBDs at once.** Its run this cycle moved on two still-un-thresholded rules — it is the top-end datapoint for **TBD-11** (23 routers, bloat saturates to 0) *and* now the noisiest **drift** case. When TBD-10/11 numbers are set, its outsized influence on both must be visible, not silently baked in.
- **Value evidence:** run-3 produced **zero** drift from broken *markdown* links across all five repos — every unit of drift came from this backtick rule. Reverting would return `routing_drift` to a check structurally incapable of firing, not to a weaker one. The ~1 genuine catch across five recent single-author repos is a floor, not a ceiling: that population is the least likely to have rotted routes and least like an inherited repo nobody has fully read.

## Consequences

- New finding category `routing_path_missing` (high) in `FindingCategory` / `SEVERITY_BY_CATEGORY`; `graph.ts` emits it for non-resolving path-shaped router backticks and counts them into `refsFromRoots` + `routingDriftCount`. `src/API.md` updates same commit (rule 8).
- `resolvedRefsFromRoots` stays "resolving edges only," so the orphans empty-basis guard and the `routing_unresolved` info finding are unaffected in trigger; but a repo like icm-architect now also carries a scored `routing_drift` of ~0. No number/threshold set.

## Non-goals

- Does not change non-router backtick handling. Does not touch weights (TBD-10) or bloat (TBD-11).
