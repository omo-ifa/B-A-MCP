# context_audit — calibration run 1 (B-A-MCP, self-audit)

**Date:** 2026-08-19
**Branch / commit at run time:** `feat/context-audit` @ `77f3bf45e854d72d0d1be3b5c08833642505b372`
**Node:** v25.2.1 · **Package version:** 0.1.0

## Purpose — read this before reading the score

This is the design's mandated **calibration run**: the first execution of the finished
`context_audit` tool, pointed at this repo (`B-A-MCP`) itself, to capture the raw metric
values TBD-10 (headline weighting), TBD-11 (bloat thresholds), and TBD-12 (coverage
significance) need in order to eventually be resolved.

**This is explicitly NOT the README sample.** The `rendered` string embedded in the JSON
below is real tool output, not hand-massaged copy, but it must not be lifted into the
README or any marketing surface. The README sample is a separate, follow-up task that
runs *after* TBD-10/11/12 are resolved from this (and likely additional) calibration data —
running the audit against a repo whose routing layer is intentionally healthy, to show the
tool at its best, not against the repo mid-build with a placeholder-weighted, uncalibrated
scorer.

No threshold constant was changed to produce this run. `TBD_11_ROUTING_TOKEN_CUTOFF`,
`TBD_11_INLINE_RATIO_CUTOFF`, `TBD_11_INLINE_MIN_TOKENS`, `TBD_11_DEPTH_CUTOFF`,
`TBD_12_MIN_FILES`, `TBD_12_SOURCE_EXTS`, and `TBD_10_WEIGHTS` in `src/tools/context-audit/`
are all still the placeholder values committed in Tasks 1–11. This document only *records*
what those placeholders produced on a real repo and *proposes* replacement values for a
future decision-resolution loop (`planning/decisions/`) to accept, adjust, or reject.

## Commands run

```bash
npm run build
node -e "import('./dist/src/tools/context-audit/index.js').then(async m => { const o = await m.runContextAudit({ path: process.cwd() }); console.log(JSON.stringify(o.ok ? o.result : o.error, null, 2)); })"
```

Both ran clean (`npm run build` — `tsc`, no errors; the tool call returned `ok: true` with a
`result`, not the `error` branch).

## Full JSON result

```json
{
  "root": {
    "path": "/Users/plato/Desktop/AI/BA-Code-Project/B-A-MCP",
    "method": "claude_md"
  },
  "score": 45,
  "subscores": {
    "bloat": 70,
    "orphans": 0,
    "broken_refs": 7,
    "routing_drift": 100,
    "coverage": 50
  },
  "findings": [
    {
      "id": "ff417eabcfd1",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 534,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/target"
    },
    {
      "id": "289573a2e4ac",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 548,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/a.md"
    },
    {
      "id": "1eb3d0f7840a",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 548,
      "message": "link points at a path that does not exist",
      "evidence": "planning/b.md"
    },
    {
      "id": "63c4d2a99aca",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 677,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/src/CONTEXT.md"
    },
    {
      "id": "ea4347780dc3",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 677,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/nope.md"
    },
    {
      "id": "ddeed752bca8",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 679,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/notes.md"
    },
    {
      "id": "a0eba1df0641",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 680,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/missing.md"
    },
    {
      "id": "63c4d2a99aca",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 690,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/src/CONTEXT.md"
    },
    {
      "id": "bd3148289dda",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 702,
      "message": "link points at a path that does not exist",
      "evidence": "secret.md"
    },
    {
      "id": "289573a2e4ac",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 878,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/a.md"
    },
    {
      "id": "a9e754c0439e",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 878,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/b.md"
    },
    {
      "id": "63c4d2a99aca",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 1374,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/src/CONTEXT.md"
    },
    {
      "id": "a0eba1df0641",
      "category": "broken_ref",
      "severity": "high",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 1374,
      "message": "link points at a path that does not exist",
      "evidence": "planning/plans/missing.md"
    },
    {
      "id": "2dcff9c0e722",
      "category": "orphan",
      "severity": "medium",
      "file": "src/API.md",
      "line": null,
      "message": "in-scope doc unreachable from any routing root",
      "evidence": "src/API.md"
    },
    {
      "id": "05b0b866e753",
      "category": "orphan",
      "severity": "medium",
      "file": "src/TDD.md",
      "line": null,
      "message": "in-scope doc unreachable from any routing root",
      "evidence": "src/TDD.md"
    },
    {
      "id": "b00fc591cd38",
      "category": "bloat",
      "severity": "low",
      "file": "CLAUDE.md",
      "line": null,
      "message": "routing file is mostly prose/tables; consider routing content out",
      "evidence": "inline_ratio=1.00"
    },
    {
      "id": "b2aa5ea12b8a",
      "category": "bloat",
      "severity": "low",
      "file": "CLAUDE.md",
      "line": null,
      "message": "total routing token weight is high",
      "evidence": "routing_tokens=4619"
    },
    {
      "id": "0ec074e91b1b",
      "category": "bloat",
      "severity": "low",
      "file": "planning/CONTEXT.md",
      "line": null,
      "message": "routing file is mostly prose/tables; consider routing content out",
      "evidence": "inline_ratio=1.00"
    },
    {
      "id": "aff42297b5d7",
      "category": "malformed_link",
      "severity": "low",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 548,
      "message": "link does not parse",
      "evidence": " "
    },
    {
      "id": "aff42297b5d7",
      "category": "malformed_link",
      "severity": "low",
      "file": "planning/plans/2026-08-18-context-audit.md",
      "line": 702,
      "message": "link does not parse",
      "evidence": " "
    },
    {
      "id": "f2ade785b16f",
      "category": "bloat",
      "severity": "low",
      "file": "src/CONTEXT.md",
      "line": null,
      "message": "routing file is mostly prose/tables; consider routing content out",
      "evidence": "inline_ratio=1.00"
    }
  ],
  "stats": {
    "docs_in_scope": 22,
    "routing_files": 4,
    "routing_tokens": 4619,
    "orphan_count": 2,
    "files_skipped": 0,
    "token_count_method": "char-approx-v1",
    "calibrated": false
  },
  "rendered": "# context_audit — routing health\n\n**Score:** 45/100  _(uncalibrated — TBD-10/11/12 stubs active; not a published figure)_\n**Root:** `/Users/plato/Desktop/AI/BA-Code-Project/B-A-MCP` (resolved via `claude_md`)\n\n| sub-score | value |\n|---|---|\n| bloat | 70 |\n| orphans | 0 |\n| broken_refs | 7 |\n| routing_drift | 100 |\n| coverage | 50 |\n\n## high (13)\n- `ff417eabcfd1` **broken_ref** planning/plans/2026-08-18-context-audit.md:534 — link points at a path that does not exist _(evidence: planning/plans/target)_\n- `289573a2e4ac` **broken_ref** planning/plans/2026-08-18-context-audit.md:548 — link points at a path that does not exist _(evidence: planning/plans/a.md)_\n- `1eb3d0f7840a` **broken_ref** planning/plans/2026-08-18-context-audit.md:548 — link points at a path that does not exist _(evidence: planning/b.md)_\n- `63c4d2a99aca` **broken_ref** planning/plans/2026-08-18-context-audit.md:677 — link points at a path that does not exist _(evidence: planning/plans/src/CONTEXT.md)_\n- `ea4347780dc3` **broken_ref** planning/plans/2026-08-18-context-audit.md:677 — link points at a path that does not exist _(evidence: planning/plans/nope.md)_\n- `ddeed752bca8` **broken_ref** planning/plans/2026-08-18-context-audit.md:679 — link points at a path that does not exist _(evidence: planning/plans/notes.md)_\n- `a0eba1df0641` **broken_ref** planning/plans/2026-08-18-context-audit.md:680 — link points at a path that does not exist _(evidence: planning/plans/missing.md)_\n- `63c4d2a99aca` **broken_ref** planning/plans/2026-08-18-context-audit.md:690 — link points at a path that does not exist _(evidence: planning/plans/src/CONTEXT.md)_\n- `bd3148289dda` **broken_ref** planning/plans/2026-08-18-context-audit.md:702 — link points at a path that does not exist _(evidence: secret.md)_\n- `289573a2e4ac` **broken_ref** planning/plans/2026-08-18-context-audit.md:878 — link points at a path that does not exist _(evidence: planning/plans/a.md)_\n- `a9e754c0439e` **broken_ref** planning/plans/2026-08-18-context-audit.md:878 — link points at a path that does not exist _(evidence: planning/plans/b.md)_\n- `63c4d2a99aca` **broken_ref** planning/plans/2026-08-18-context-audit.md:1374 — link points at a path that does not exist _(evidence: planning/plans/src/CONTEXT.md)_\n- `a0eba1df0641` **broken_ref** planning/plans/2026-08-18-context-audit.md:1374 — link points at a path that does not exist _(evidence: planning/plans/missing.md)_\n\n## medium (2)\n- `2dcff9c0e722` **orphan** src/API.md — in-scope doc unreachable from any routing root _(evidence: src/API.md)_\n- `05b0b866e753` **orphan** src/TDD.md — in-scope doc unreachable from any routing root _(evidence: src/TDD.md)_\n\n## low (6)\n- `b00fc591cd38` **bloat** CLAUDE.md — routing file is mostly prose/tables; consider routing content out _(evidence: inline_ratio=1.00)_\n- `b2aa5ea12b8a` **bloat** CLAUDE.md — total routing token weight is high _(evidence: routing_tokens=4619)_\n- `0ec074e91b1b` **bloat** planning/CONTEXT.md — routing file is mostly prose/tables; consider routing content out _(evidence: inline_ratio=1.00)_\n- `aff42297b5d7` **malformed_link** planning/plans/2026-08-18-context-audit.md:548 — link does not parse _(evidence:  )_\n- `aff42297b5d7` **malformed_link** planning/plans/2026-08-18-context-audit.md:702 — link does not parse _(evidence:  )_\n- `f2ade785b16f` **bloat** src/CONTEXT.md — routing file is mostly prose/tables; consider routing content out _(evidence: inline_ratio=1.00)_\n\n## stats\n- docs_in_scope: 22, routing_files: 4, routing_tokens: 4619\n- files_skipped: 0, token_count_method: `char-approx-v1`\n\n> `coverage` measures whether the routing layer **claims** your code, not whether the claim is **accurate** — content accuracy is `doc_drift`'s job."
}
```

## Invariant confirmations (design's calibration-run gate)

All five checked directly against the JSON above (and re-verified programmatically):

| Invariant | Observed | Result |
|---|---|---|
| `root.method === "claude_md"` | `"claude_md"` | **PASS** |
| No `high`-severity `coverage` finding fired (TBD-12 build guard held) | `findings` contains zero entries with `category: "coverage"` at any severity — the guard (`opts?.emitHighFindings`, defaulted off in `index.ts`) was never enabled in this call path | **PASS** |
| `stats.calibrated === false` | `false` | **PASS** |
| `stats.token_count_method === "char-approx-v1"` | `"char-approx-v1"` | **PASS** |
| No path above the repo root in any finding's `file`/`evidence` | Scanned all 21 findings' `file` and `evidence` fields for a leading `/` or a `..` segment — zero matches. (`root.path` itself is an absolute path, but that is the resolved root identifier, not a finding.) | **PASS** |

The tool call itself returned `{ ok: true, result: {...} }` — the `error` branch was never hit, confirming `NO_ROUTING_ROOT` did not fire (this repo has a root `CLAUDE.md`).

## TBD-10 — headline weighting: observed values + proposal

**Current placeholder** (`src/tools/context-audit/score.ts`, `TBD_10_WEIGHTS`, unchanged):

| sub-score | weight |
|---|---|
| `broken_refs` | 3 |
| `routing_drift` | 3 |
| `orphans` | 2 |
| `coverage` | 2 |
| `bloat` | 1 |

**Observed sub-scores this run:** `bloat=70, orphans=0, broken_refs=7, routing_drift=100, coverage=50`.
**Observed headline:** `45` — reproduces exactly as `round((70·1 + 0·2 + 7·3 + 100·3 + 50·2) / 11) = round(491/11) = 45`.

**Observation that matters for the weighting decision:** `routing_drift=100` here is **not** evidence
of a clean routing layer — it is the "empty population defaults to 100" branch of
`subscoreFromCount`. `refsFromRoots` (the denominator: edge-classified `[text](path)` links
whose *source* doc is a router) was **0**. None of this repo's four router files
(`CLAUDE.md`, `ops/CONTEXT.md`, `planning/CONTEXT.md`, `src/CONTEXT.md`) use Markdown
hyperlink syntax to reference workspace paths — they use bare backtick code spans in
tables (e.g. `` `prompts/` ``, `` `src/CONTEXT.md` ``), which `extractLinks` does not treat
as edges. So `routing_drift`'s 100 here means "zero real edges to check," not "checked and
clean." A headline-weighting function that gives `routing_drift` the top weight (3) is, on
this repo, rewarding an artifact of the routing convention rather than a verified property.

**Proposed (not resolved):** keep the current relative structure (accuracy cluster >
bloat) as the resolved *principle* already states, but do not lock in specific numbers off
a single repo. Concretely propose:
1. Keep `broken_refs: 3`, `routing_drift: 3`, `orphans: 2`, `coverage: 2`, `bloat: 1` as the
   working default — this run neither confirms nor contradicts the relative ordering.
2. Before resolving TBD-10 for real, decide whether a sub-score reaching 100 via an
   empty-denominator default should count identically to a sub-score reaching 100 via a
   verified check with a non-trivial denominator — e.g. by adding a `confidence` or
   `n` field alongside each sub-score so the weighting function (or a human) can discount
   near-empty-denominator scores. This run is the concrete case that motivates that
   question (`refsFromRoots=0`, `orphanCandidateTotal=2` — both denominators are tiny).
3. Gather at least 2–3 more calibration runs against repos with real hyperlink-style
   routing before locking numbers.

## TBD-11 — bloat thresholds: observed values + proposal

**Current placeholders** (`src/tools/context-audit/bloat.ts`, unchanged):

```
TBD_11_ROUTING_TOKEN_CUTOFF = 4000   // routing weight above this starts penalizing
TBD_11_INLINE_RATIO_CUTOFF  = 0.85   // fraction of non-link chars above this = inlining
TBD_11_INLINE_MIN_TOKENS    = 200    // inline-ratio check only fires if tokens exceed this
TBD_11_DEPTH_CUTOFF         = 4      // routing nesting depth above this = deep chain
```

**Per-router breakdown observed this run** (`char-approx-v1` tokens):

| router file | tokens | inline_ratio | depth |
|---|---:|---:|---:|
| `CLAUDE.md` | 3347 | 1.00 | 0 |
| `ops/CONTEXT.md` | 47 | 1.00 | 1 |
| `planning/CONTEXT.md` | 414 | 1.00 | 1 |
| `src/CONTEXT.md` | 811 | 1.00 | 1 |
| **total** | **4619** | — | — |

Findings fired: `routing_tokens=4619` (total over cutoff by 619 → penalty
`min(40, floor(619/1000)·5) = 0`) plus three `inline_ratio=1.00` findings (`CLAUDE.md`,
`planning/CONTEXT.md`, `src/CONTEXT.md`; `ops/CONTEXT.md` was under `TBD_11_INLINE_MIN_TOKENS`
at 47 tokens so it did not fire) at 10 points each → total penalty 30 → `bloat` sub-score
`70`. No `routing_chain_depth` findings — no router nests deeper than 1 level, well under
the cutoff of 4.

**Observations that matter for these thresholds:**
- **Routing-token cutoff (4000):** this repo's routing layer is legitimate, table-heavy
  documentation (workspace-layout table, document index, rules, TBD tracker excerpt) — not
  padding — and still lands at 4619, just 619 over cutoff. `CLAUDE.md` alone is 3347 of
  that. A 4-router-file repo following this project's own documented convention (a
  `CONTEXT.md` per workspace, each with tables) trips the "high routing weight" penalty by
  default at a fairly small size, which suggests 4000 may be tight if the project's own
  convention is meant to be a positive example rather than something the tool should flag.
- **Inline-ratio cutoff (0.85) is not discriminating on this repo at all:** all four
  routers scored exactly 1.00, because none of them use `[text](path)` hyperlinks — they
  reference workspace paths via bare backtick code spans inside tables. The metric's
  underlying assumption ("routing = hyperlinks out, so a low link-char fraction means
  well-routed") does not match this repo's actual, intentional convention, so this run
  produces no useful signal to move 0.85 or 200 in either direction — it only exposes a
  blind spot in what counts as a "link" for this metric.
- **Depth cutoff (4):** no data above depth 1 in this run; cutoff is unconstrained by this
  repo.

**Proposed (not resolved):**
1. `TBD_11_ROUTING_TOKEN_CUTOFF`: propose raising from 4000 to roughly 6000 to give
   headroom for 4–5 legitimate router files at this project's own table density, while
   still catching materially larger routing layers. Flagged proposed, not resolved — needs
   a second repo with a genuinely bloated router (10k+ tokens) to confirm the top end.
2. `TBD_11_INLINE_RATIO_CUTOFF` / `TBD_11_INLINE_MIN_TOKENS`: propose leaving both
   unchanged (0.85 / 200) — this run supplies no contrast data. Separately flag, as a
   design question for the resolution loop (not a threshold number): should
   `extractLinks`/the ratio calculation also count backtick-fenced inline code paths as
   "links" for repos that route via code spans instead of Markdown hyperlinks? Left open,
   not decided here.
3. `TBD_11_DEPTH_CUTOFF`: propose leaving at 4 — no data against it. Needs a repo with a
   real multi-level nested `CONTEXT.md` chain to calibrate meaningfully.

## TBD-12 — coverage significance: observed values + proposal

**Current placeholders** (`src/tools/context-audit/coverage.ts`, unchanged):

```
TBD_12_MIN_FILES   = 5   // "significant" = at least this many source files in the dir
TBD_12_SOURCE_EXTS = [.ts, .js, .tsx, .jsx, .py, .go, .rs, .java, .rb]
```

The `high`-severity "uncovered significant workspace" finding stayed **gated off**
(`opts?.emitHighFindings` defaults to `false`, and `index.ts` calls `scoreCoverage(root, w,
g)` with no `opts`) — confirmed above as the TBD-12 build-guard invariant. The values below
were captured by calling `scoreCoverage` a second time with the gate forced on, purely to
observe what *would* fire; that second call was never part of the production path and
changed nothing in the shipped result.

**All directories in the repo with ≥1 source file, and their source-file counts:**

| dir | file count (all) | has `CONTEXT.md` | source files | significant (≥5)? |
|---|---:|---|---:|---|
| `src` | 6 | yes | 2 | no |
| `src/tools/context-audit` | 11 | no | 11 | **yes** |
| `test` | 2 | no | 2 | no |
| `test/context-audit` | 11 | no | 11 | **yes** |

**Coverage of the 2 significant directories:**

| dir | covered? | why |
|---|---|---|
| `src/tools/context-audit` | **covered** | falls under the `src` routed-dir prefix (`graph.routedDirs = {"src"}`) |
| `test/context-audit` | **uncovered** | no `CONTEXT.md`, not under any routed dir — `routedDirs` contains only `"src"` this run |

→ coverage sub-score `round(100 · 1/2) = 50`, matching the run.

If the build guard were lifted today, exactly **one** `high`-severity coverage finding
would fire: `test/context-audit/` (`files=11`). It did not fire in the actual run because
the guard held (invariant confirmed above).

**Observations that matter for this threshold:**
- `TBD_12_MIN_FILES=5` correctly separates the two substantial, single-purpose
  subdirectories (11 files each) from the shallow top-level `src`/`test` dirs (2 files
  each) — on this repo the significance line lands in a sensible place, though n=1 dir-pair
  is a thin sample.
- The one real signal this run produces — `test/context-audit/` is an 11-file test
  directory with no routing coverage at all — looks like a genuine, correctly-detected gap
  rather than a false positive: this task branch's own test suite (39 tests, per the task
  brief) has no `CONTEXT.md` and isn't referenced from any router.
- Whether `test/` directories should be held to the same coverage bar as `src/` directories
  (test code is often self-documenting via file/test names rather than needing routing
  prose) is a real open policy question this run surfaces, not something to guess at here.

**Proposed (not resolved):**
1. `TBD_12_MIN_FILES`: propose keeping at 5 — this run's data is consistent with it but too
   thin (one repo, one significant/non-significant boundary pair) to lock in.
2. `TBD_12_SOURCE_EXTS`: propose keeping the list as-is — this repo is pure TypeScript so it
   supplies no evidence for or against any of the other extensions.
3. New question surfaced for the resolution loop (not a numeric proposal): should
   `test/`-rooted directories be exempt from, or held to a lower bar than, `src/`-rooted
   directories for coverage significance? Left open.

## Summary table — all three TBDs

| TBD | Constant(s) | Current placeholder | Observed on B-A-MCP | Proposed (not resolved) |
|---|---|---|---|---|
| TBD-10 | `TBD_10_WEIGHTS` | `broken_refs:3, routing_drift:3, orphans:2, coverage:2, bloat:1` | headline `45` from subscores `bloat=70, orphans=0, broken_refs=7, routing_drift=100, coverage=50`; `routing_drift=100` traced to an empty-denominator default (`refsFromRoots=0`), not a verified clean check | keep weights as-is; add a confidence/`n` signal before resolving; gather more repos |
| TBD-11 | `ROUTING_TOKEN_CUTOFF=4000`, `INLINE_RATIO_CUTOFF=0.85`, `INLINE_MIN_TOKENS=200`, `DEPTH_CUTOFF=4` | as listed | total routing tokens `4619` (4 routers: `3347/47/414/811`); inline_ratio `1.00` on all 4 (backtick-path convention, no hyperlinks); max depth `1` | raise token cutoff to ~6000; leave inline-ratio/min-tokens/depth unchanged; flag backtick-vs-hyperlink blind spot as a design question |
| TBD-12 | `MIN_FILES=5`, `SOURCE_EXTS` | as listed | 2 significant dirs found (`src/tools/context-audit` 11 files — covered; `test/context-audit` 11 files — uncovered) → coverage subscore `50`; guard confirmed off, no high finding fired | keep `MIN_FILES=5` and `SOURCE_EXTS` unchanged; open policy question on `test/`-dir treatment |

## What this run does NOT do

- It does not change `TBD_10_WEIGHTS`, `TBD_11_*`, or `TBD_12_*` in code.
- It does not enable the TBD-12 `emitHighFindings` build guard in the shipped path (the
  one call made with the gate forced on was a read-only, out-of-band observation, not part
  of `runContextAudit`).
- It is not the README sample. The README waits for the post-calibration re-run, after
  TBD-10/11/12 are actually resolved (separate `planning/decisions/` records) and the
  scorer stops reporting `calibrated: false`.
