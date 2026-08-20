# Decision — TBD-1: claude-mem ships an Apache-2.0 `NOTICE`; reproduce it

**Date:** 2026-08-20
**Status:** Resolved
**Decider:** B&A (product owner)
**Resolves:** TBD-1 (claude-mem `NOTICE` file existence — Apache-2.0 compliance in `THIRD_PARTY_NOTICES.md`)
**Evidence:** `planning/calibration/2026-08-20_provenance-and-routing-census.md` §1 (survey of `~/dev/ba-calibration/claude-mem` @ `e2d1df5`)

---

## Question

Does claude-mem's upstream repo ship an Apache-2.0 `NOTICE` file? Apache-2.0 §4(d)
obligates a redistributor to reproduce the contents of any `NOTICE` the licensor provides.
If one exists, B&A's `THIRD_PARTY_NOTICES.md` must carry it; if none exists, there is nothing
to reproduce and the notice block only needs the license text + attribution.

## Resolution

**A `NOTICE` file exists** at the root of the claude-mem repo (`e2d1df5`, 242 bytes). Verbatim
contents:

```
Claude-Mem
Copyright 2026 Alex Newman

This product includes software developed for the Claude-Mem project.

Licensed under the Apache License, Version 2.0.

If other attributions are required by dependencies or included code, add them here.
```

The repo's `LICENSE` is the full Apache License 2.0 text; `package.json` and
`.claude-plugin/plugin.json` both declare `"license": "Apache-2.0"` with author `Alex Newman`.

## Consequence

- `THIRD_PARTY_NOTICES.md`'s claude-mem block must **reproduce the `NOTICE` contents above**
  (Apache-2.0 §4(d)), in addition to the license identifier, attribution, upstream URL, pinned
  version, and modified/unmodified statement (rule 4). This is a same-commit obligation when the
  notices file is authored.
- Author of record is **Alex Newman** (all three sources agree), though the repo is hosted at
  `github.com/thedotmack/claude-mem`.
- Pin claude-mem to a **commit** in the notices file, consistent with the general pinning rule;
  latest tag observed was `v13.15.3` (HEAD `e2d1df5` was not itself tagged).

## Non-goals

- Does not author `THIRD_PARTY_NOTICES.md` (still stubbed until all of TBD-2 resolves; the notices
  file lands as one release-blocking artifact). This record only fixes **what** claude-mem's block
  must contain.
- Does not resolve TBD-2 (the five-component license confirmation) or TBD-4 (ICM provenance).
