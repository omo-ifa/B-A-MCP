# TBD-2 and TBD-4 resolved — bundled-component licenses + ICM reproduction

**Date:** 2026-08-27
**Resolves:** TBD-2, TBD-4 (and closes TBD-1, TBD-7 as sub-items)
**Owner rulings:** product owner (B&A), this session
**Consumes:** `planning/calibration/2026-08-20_provenance-and-routing-census.md` (§1 provenance table, §5 caveman split-license audit)
**Same-commit set (rule 4 + rule 8-analogue):** `THIRD_PARTY_NOTICES.md`, `planning/Integration_Spec.md`, this record, `src/TDD.md`

---

## Why now

All three free tools ship; the free tier is feature-complete. The Phase-1
release (`LICENSE` + `THIRD_PARTY_NOTICES.md` final + `npm publish` dry-run) was
blocked on two owner-gated TBDs. This record resolves both so the notices file
can be finalized (rule 4) and the release can proceed.

## Verification method

The five bundled components are cloned under `~/dev/ba-calibration/`. Each was
re-verified live this session: `HEAD`, tag on `HEAD`, and license file(s) read
from the component's own tree — not from a third-party listing (TBD-2's explicit
requirement). All five HEADs matched the 2026-08-20 census exactly (no drift).
The MCP SDK and `ignore` runtime-dependency license texts were re-read from the
installed `node_modules`.

## TBD-2 — bundled-component licenses (RESOLVED)

Each license confirmed from the component's own files at the pinned commit:

| Component     | License                         | Copyright line (verbatim)          | Pin (commit) | Tag        |
|---------------|---------------------------------|------------------------------------|--------------|------------|
| superpowers   | MIT                             | `Copyright (c) 2025 Jesse Vincent` | `b36e082`    | `v6.3.0`   |
| caveman       | MIT (scoped to `skills/caveman/`) | `Copyright (c) 2026 Julius Brussee` | `a42ef76`   | `pi-v0.1.0`|
| claude-mem    | Apache-2.0                      | `Copyright 2026 Alex Newman`        | `e2d1df5`    | none       |
| task-observer | CC-BY-4.0                       | Eoghan Henn / rebelytics.com (README) | `281f134` | `v2.0.0`   |
| icm-architect | MIT                             | `Copyright (c) 2026 Jake Van Clief` | `b20fb45`    | none       |

**caveman — the open sub-item (RESOLVED).** The repo is split-licensed. Its
`LICENSING.md` is the per-directory source of truth and states the entire
`skills/` tree is **MIT and "untouched"**; the Engine-linked directories
(`engine/`, `proxy/`, `cacheengine/`, `rewriter/`, `browse/`, `mcp/`, `shrink/`,
`mem/` Go core, `shared/platform/`) are **BSL-1.1** and are **not** bundled. B&A
bundles only the prose skill at `skills/caveman/` (`SKILL.md` + `README.md`).

- **Ruling — pin:** the exact **commit `a42ef76`**, not a version string or tag.
  The `package.json` version (`2.2.0`) and the git tag on the commit
  (`pi-v0.1.0`) disagree; the commit is immutable and authoritative.
- The notice path-scopes to `skills/caveman/` and reproduces the repo root
  `LICENSE` including its scope note; it does **not** state or imply whole-repo
  MIT. Widening the bundle beyond `skills/caveman/` requires a fresh path audit
  against `LICENSING.md`, never a blanket `skills/*` pin.

**TBD-1 (closed as a sub-item).** claude-mem ships a `NOTICE` file. Apache-2.0
§4(d) requires it be carried; reproduced verbatim in the notices file.

**TBD-7 (closed as a sub-item).** superpowers pin recorded as `v6.3.0` (commit
`b36e082`).

**Doc correction found during verification.** The notices/Integration_Spec
previously credited icm-architect to "RinDig". RinDig is the GitHub
*organization*; the copyright holder in the `LICENSE` is **Jake Van Clief**.
Corrected in both files.

## TBD-4 — ICM reproduce-vs-paraphrase (RESOLVED)

**Ruling:** B&A **reproduces** expression — specifically from the bundled
**`icm-architect` files** (Jake Van Clief, MIT), not from the ICM *paper*'s text.

- **Consequence:** the reproduction is covered by the icm-architect **MIT**
  notice plus an explicit reproduction/attribution statement in that block
  (copyright line + license text retained in the bundle satisfy MIT). No
  separate paper-license dependency is created, because the reproduced
  expression is the MIT-licensed repository files, not the paper.
- **Provenance kept separate (census §1).** The icm-architect *code* copyright
  is **Van Clief alone**; McDermott is a *paper* co-author, not a code-license
  holder. The paper (Van Clief & McDermott, 2026) is a separate work; B&A does
  not claim the methodology as B&A-original.
- **"B&A-original methodology" copy check.** Repo scan found **no** copy claiming
  the ICM methodology as B&A-original — the shipped docs *distinguish* B&A
  (governance) from icm-architect (generation) rather than claiming originality.
  Nothing to correct in this release. Any future marketing/product copy that
  claims the methodology as B&A-original would reopen this obligation.

## What unblocks

- `THIRD_PARTY_NOTICES.md` is finalized (STUB banner removed; all five bundled
  blocks + both runtime deps filled from source).
- `planning/Integration_Spec.md` §2 pins recorded; verification checklist ticked.
- Remaining Phase-1 release step: `npm publish` dry-run from a fresh checkout
  (`ops/CONTEXT.md`), then publish on a semver tag.
