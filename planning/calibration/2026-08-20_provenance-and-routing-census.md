# Calibration pre-flight — provenance survey + routing census (STOP point hit)

**Date:** 2026-08-20
**B-A-MCP commit at run time:** `7948898` (`794889888d59eca3731f23abc664a0ead67ed4a5`, branch `main`)
**Tool built from:** that commit · **Node:** v25.2.1 · **Package:** 0.1.0
**Stub threshold values in effect (unchanged this session):**
`TBD_10_WEIGHTS = {broken_refs:3, routing_drift:3, orphans:2, coverage:2, bloat:1}`;
`TBD_11 = {ROUTING_TOKEN_CUTOFF:4000, INLINE_RATIO_CUTOFF:0.85, INLINE_MIN_TOKENS:200, DEPTH_CUTOFF:4}`;
`TBD_12 = {MIN_FILES:5, SOURCE_EXTS:[.ts,.js,.tsx,.jsx,.py,.go,.rs,.java,.rb]}`.

> **Outcome: STOP before calibration.** The routing census fired the user's hard stop —
> **0 of 5** repos route via markdown links; all use backtick code-span paths, exactly like
> B-A-MCP. Per the brief, that is a **v1 correctness finding**, not a v1.1 note. No thresholds
> were resolved. No calibration-run-N docs were written. `THIRD_PARTY_NOTICES.md`,
> `Integration_Spec.md`, and `src/TDD.md` were **not** touched (those resolutions go through
> `/decisions`).

The five repos are cloned under `~/dev/ba-calibration/`. `task-observer` is cloned under its
canonical repo name `one-skill-to-rule-them-all`.

---

## 1. Provenance survey

| Repo (clone dir) | HEAD | Tag on HEAD | License (from its own file) | Copyright holder / year (verbatim) | NOTICE? | Root routing doc + style | md files | root CLAUDE.md bytes |
|---|---|---|---|---|---|---|---|---|
| **superpowers** | `b36e082` | `v6.3.0` | MIT (`LICENSE`; `plugin.json` `"license":"MIT"`) | `Copyright (c) 2025 Jesse Vincent` | no | `CLAUDE.md` — **backtick paths** (0 md-links) | 94 | 8 873 |
| **caveman** | `a42ef76` | `pi-v0.1.0` | **Split**: `LICENSE` MIT + `LICENSE.BSL` (BSL-1.1); `LICENSING.md` is per-dir source of truth | `Copyright (c) 2026 Julius Brussee` | no | `CLAUDE.md` (29 714 B) — **backtick paths** (0 md-links, 228 backtick spans) | 179 | 29 714 |
| **claude-mem** | `e2d1df5` | none on HEAD (latest `v13.15.3`) | Apache-2.0 (`LICENSE`; `package.json`/`plugin.json` `"Apache-2.0"`) | `NOTICE`: `Copyright 2026 Alex Newman` | **YES** | `CLAUDE.md` (1 045 B) — **backtick paths** (0 md-links) | 185 | 1 045 |
| **task-observer** (`one-skill-to-rule-them-all`) | `281f134` | `v2.0.0` | CC-BY-4.0 (`LICENSE.txt` = CC Attribution 4.0 International legalcode) | holder **not in LICENSE**; README requires credit to **"Eoghan Henn / rebelytics.com"** + repo link | no | **none** (no CLAUDE.md/CONTEXT.md/AGENTS.md) | 6 | — |
| **icm-architect** | `b20fb45` | none (no tags) | MIT (`LICENSE`) | `Copyright (c) 2026 Jake Van Clief` | no | **none at root** (only `assets/templates/{CLAUDE,CONTEXT}.md` scaffolds — backtick paths) | 13 | — |

### Against the design doc's packaging table

Design doc claims: Superpowers MIT · caveman MIT · claude-mem Apache-2.0 · task-observer CC-BY-4.0 · icm-architect MIT.

- **superpowers — MIT — CONFIRMED.** Matches `LICENSE` + `plugin.json`.
- **claude-mem — Apache-2.0 — CONFIRMED, and TBD-1 ANSWERED.** A `NOTICE` file **exists**
  (242 B, `Copyright 2026 Alex Newman`, points at Apache-2.0, invites downstream additions).
  TBD-1 asked exactly this. Author on record is **Alex Newman** (`package.json`/`plugin.json`/`NOTICE`),
  though the repo lives at `github.com/thedotmack/claude-mem`.
- **icm-architect — MIT — CONFIRMED,** holder `Jake Van Clief` (2026). **Flag for TBD-4:** the
  tracker names the ICM paper as "Van Clief & McDermott, 2026"; the *repo copyright* is Van Clief
  alone. McDermott is a paper co-author (methodology provenance), not a code-license holder — keep
  the reproduce-vs-paraphrase question (TBD-4) separate from the MIT notice.
- **task-observer — CC-BY-4.0 — CONFIRMED,** but **flag:** the `LICENSE.txt` is the bare CC
  legalcode with **no embedded copyright holder**. The required attribution string lives in the
  **README** ("give appropriate credit: link the repo + name Eoghan Henn / rebelytics.com"). The
  notice must lift the holder from the README, not the license file. Consistent with CLAUDE.md
  rule 5 (no DRM on the CC-BY `task-observer` files).
- **caveman — "MIT" is INCOMPLETE / needs scoping — FLAG.** caveman is **dual-licensed**. Root
  `LICENSE` is MIT *with a scope note* excluding the Engine-linked dirs (`engine/`, `proxy/`,
  `cacheengine/`, `rewriter/`, `browse/`, `mcp/`, `shrink/`, cavemem Go core, `shared/platform/`),
  which are **BSL-1.1** (`LICENSE.BSL`). Per `LICENSING.md`, **`skills/` is explicitly MIT and
  "untouched."** B&A bundles the caveman **prose skill** (lives under `skills/`) → the bundled
  component **is MIT**. But the notice must scope to `skills/` and must **not** state or imply the
  whole repo is MIT — the engine is BSL-1.1 with a commercial-use grant. Also a **version
  mismatch to resolve at pinning:** `package.json` = `2.2.0`, root plugin = unversion-tagged here,
  git tag on HEAD = `pi-v0.1.0` — pin a specific commit, not "latest".

---

## 2. Routing census — the STOP point

**Question:** how many repos route via markdown links `[text](path)` vs. backtick code-span paths
`` `path/` `` vs. no context layer at all?

| Repo | Routing convention | md-link routing edges from routers |
|---|---|---|
| superpowers | backtick paths | **0** |
| caveman (root + ~20 nested `CLAUDE.md`) | backtick paths | **0** (1 stray `[..](x.md)` in `packages/cli`, not routing) |
| claude-mem | backtick paths | **0** |
| task-observer | **no context layer** | — |
| icm-architect | **no root context layer** (only asset-template scaffolds) | — |

**Census result: markdown-link routing = 0 repos. Backtick-path routing = 3 (superpowers,
caveman, claude-mem). No context layer = 2 (task-observer; icm-architect at root).**

This is the condition the brief named as a stop: *"If few or none use markdown links, stop and
report before running calibration — that's a v1 correctness finding, not a v1.1 note, and it
would mean routing_drift/broken_ref rarely fire in the wild."* **None** use markdown links.

---

## 3. Evidence runs (NOT calibration runs — diagnostic, thresholds untouched)

Two runs, purely to confirm the census prediction empirically. Stub values above were in effect;
`stats.calibrated` was `false` in both. Every sub-score `n` is recorded.

### superpowers (`b36e082`) — backtick-routed root `CLAUDE.md`

```
method=claude_md  score=24 (uncalibrated)
subscores: bloat={score:90, n:1}  orphans={score:0, n:61}  broken_refs={score:35, n:37}
           routing_drift={score:null, n:0}  coverage={score:0, n:1}
stats: docs_in_scope=92 routing_files=1 routing_tokens=2211 orphan_count=61
findings: broken_ref×24, orphan×61, bloat×1, symlink×1
```

### task-observer / one-skill (`281f134`) — no context layer

```
method=git_root  score=null (not assessed)
subscores: ALL {score:null, n:0}
stats: docs_in_scope=6 routing_files=0 routing_tokens=0
findings: root_absent×1
```

### What the two runs prove

- **`routing_drift` is degenerate on backtick routers — confirmed.** superpowers: `n=0` →
  `null`. The confidence signal (2026-08-20 decision) correctly reports "not assessed" instead
  of a fake 100. Good — but it means the **top-weighted accuracy sub-score never fires** on
  real ecosystem repos.
- **The parser gap is WORSE than "rarely fires."** On backtick routers it doesn't just go
  quiet — it **manufactures false positives**. superpowers scored **61 orphans** and
  **coverage = 0** *only because* `extractLinks` reads no edges out of the backtick-routed
  `CLAUDE.md`, so reachability sees nothing routed → everything orphaned, nothing covered.
  Those zeros are *confidently wrong*, unlike `routing_drift`'s honest `null`. `orphans` and
  `coverage` do **not** get the benefit of the `n`-signal here because their populations are
  non-empty (61 candidate docs, 1 dir) — the bug hides behind a healthy-looking `n`.
- **`broken_refs` is NOT uniformly degenerate.** superpowers `n=37` — because superpowers'
  *skill docs* (non-router files) use markdown links even though its *router* does not. So
  `broken_refs` (edges from non-root docs) can have a real population while `routing_drift`
  (edges from routers) stays empty. The two accuracy sub-scores fail differently.
  **Read `broken_refs={score:35, n:37}` correctly: 35 is the sub-score (0–100), not a count.**
  The counts are **24 broken_ref findings over 37 checked edges** — a high failure rate for a
  mature repo, flagged for a resolver spot-check (see §6), not a "35 broken refs" alarm.
- **The honest-vs-confident asymmetry is the finding to design around** (not "both accuracy
  sub-scores are undetectable"). `routing_drift` fails **honestly**: `n=0 → null →` "not
  assessed", caught by the confidence signal. `orphans` and `coverage` fail **confidently
  wrong**: superpowers' `orphans=0 (n=61)` and `coverage=0 (n=1)` have non-empty populations,
  so the `n`-signal never trips — the bug hides behind a plausible denominator, and the
  headline `24` is *fabricated*, not low, with nothing in the output marking it suspect. For a
  tool whose entire claim is unfakeability, a confidently-wrong number is worse than a metric
  that does not fire. This motivates a **structural guard** (§6), not only the parser fix.
- **The zero-context-layer path works correctly.** task-observer → everything `null`,
  `score=null`, one honest `root_absent` finding. The confidence signal does exactly the right
  thing on the zero-doc floor. This is a positive confirmation, not a threshold datapoint.

---

## 4. Why the thresholds stay stubbed (n=5 behaves like n=1)

The brief's amendment: these five are all Claude Code-ecosystem tooling from a small community;
if they share conventions, "n=5 behaves like n=1." **They do share the decisive convention** —
backtick-path routing, zero markdown-link routing, across all three that have a context layer.
On the routing dimension this set is literally **n=1: one convention, three instances + two
empties.** Treating them as five independent datapoints for TBD-10/11 would be the same
self-referential error that got `ROUTING_TOKEN_CUTOFF=6000` rejected.

Per-TBD spread verdict:

- **TBD-10 (headline weights)** — **leave stubbed.** The two accuracy sub-scores it weights
  highest (`routing_drift`, `broken_refs`) are exactly the ones the parser gap corrupts.
  Resolving weights now bakes the artifact into the rubric. Rule 7: a number the data doesn't
  support is a guess.
- **TBD-11 (bloat thresholds)** — **leave stubbed.** A genuinely bloated monolithic router
  *does* exist in the set: **caveman's root `CLAUDE.md` ≈ 7 429 tokens** (29 714 B ÷ 4),
  above the 4000 stub *and* the rejected 6000 — a real top-end candidate for
  `ROUTING_TOKEN_CUTOFF` (that metric counts router tokens and does **not** depend on link
  parsing). **But** the `INLINE_RATIO` metric *is* corrupted by the same parser gap (backtick
  routers show `inline_ratio≈1.00` unconditionally, as run-1 already showed), and one bloated
  repo cannot fix a cutoff's top end alone. Net: caveman is a *pending* top-end datapoint to use
  **after** the parser gap is fixed, not a resolution now.
- **TBD-12 (coverage significance)** — **leave stubbed.** Source-layout spread *does* exist
  (superpowers = skills-heavy few-source; claude-mem = TS package; caveman = polyglot monorepo
  TS/Go/Python; icm = asset/template repo; task-observer = pure-md), and the zero-floor case is
  covered. **But** `coverage` is precisely the sub-score the parser gap drives to a false `0`
  (superpowers), so `MIN_FILES` cannot be read off corrupted coverage output.

**Deferral recorded:** TBD-10, TBD-11, TBD-12 all remain **open, data-blocked**, unchanged.
The blocker is no longer "not enough repos" — it is that **the instrument mis-measures the
routing convention every repo in the wild actually uses.** Fix the parser first.

### Named pending datapoints (carry these into post-parser-fix calibration)

Recorded here so they survive and are not rediscovered from scratch:

| Datapoint | Value | For | Status |
|---|---|---|---|
| **caveman root `CLAUDE.md`** (`a42ef76`) | 29 714 B ≈ **7 429 char-approx tokens** | **TBD-11 `ROUTING_TOKEN_CUTOFF` top end** | First **non-tautological** signal above both the 4000 stub and the rejected 6000. `ROUTING_TOKEN_CUTOFF` counts router tokens and does **not** need link parsing, so this datapoint is valid *now* — but it is still **one repo**, so **not resolvable**. Re-measure post-fix (nested-`CLAUDE.md` discovery may raise the total; see open question below) and combine with ≥1 more bloated router before resolving. |

Open question to settle at re-measure: caveman has ~20 nested `CLAUDE.md` routers. superpowers'
run counted `routing_files=1` (root only; `AGENTS.md` and nested not counted). Whether router
discovery is root-only or recursive determines caveman's *total* routing-token figure and its
depth signal (TBD-11 `DEPTH_CUTOFF`) — verify before using caveman's numbers.

---

## 5. Recommended next step (a decision, not auto-taken)

**Promote the backtick-path parser gap to a v1 correctness fix** (per the brief's own framing).
`extractLinks` should treat backtick code-span paths in routing files as routing edges (or a
defined subset — e.g. spans that resolve to an existing in-repo path), so `routing_drift`,
`orphans`, and `coverage` stop mis-reading the dominant real-world convention. This is worth
more than any threshold: it is the difference between the tool working on real repos and not.
After the fix, re-run all five (caveman especially, for the TBD-11 top end), *then* revisit
TBD-10/11/12 — still never off B-A-MCP alone.

This is a scope decision (fix parser as v1 vs. defer) and a code change, so it stops here for
direction. Whatever lands goes on a branch + PR with `superpowers:test-driven-development` and
the code reviewers, never direct to `main`.

---

## 6. Open follow-ups (reported to product owner; build nothing until greenlit)

1. **`broken_ref` resolver spot-check.** 24 findings over 37 edges on superpowers is a high
   failure rate for a mature repo — could be real, or a resolver bug (likely suspects: relative
   paths resolved against repo root instead of the containing file's directory; anchor/fragment
   handling). Hand-verify a sample of the 24 against files on disk, report genuine vs. false
   positive per case. If it's the resolver, it rides the same fix branch as the parser gap.
2. **Structural guard (worth having even after the parser fix).** The parser fix addresses the
   *known* cause (backtick routers → empty edge set); a guard addresses the *class*. Proposal
   under evaluation: when a repo's **routers** yield **zero resolvable routing edges**,
   `orphans` and `coverage` should report `null` ("not assessed") and drop from the weighted
   mean — instead of `orphans=0`/`coverage=0`, which are confidently wrong (superpowers §3).
   This generalizes the `n`-signal from "empty population" to "empty *routing basis*," so any
   future gap that empties the edge set fails honestly rather than fabricating a headline.
   **Recommendation reported separately; not resolved here, and TBD-10 weights untouched.**

These do not block the census record. `THIRD_PARTY_NOTICES.md`, `Integration_Spec.md`, and
`src/TDD.md` are intentionally **not** modified in this document's PR; the license/TBD
resolutions below go through `/decisions` **after** this census PR merges:

- **TBD-1 — ANSWERED.** claude-mem ships a `NOTICE` (242 B, `Copyright 2026 Alex Newman`);
  Apache-2.0 §4(d) requires reproducing its contents in `THIRD_PARTY_NOTICES.md`.
- **TBD-7 — ANSWERED.** Superpowers `v6.3.0` (`b36e082`) — pin the **commit**.
- **TBD-4 — NARROWED, not resolved.** Van Clief holds the *code* copyright; McDermott is
  paper-only. The MIT notice and the reproduce-vs-paraphrase question are cleanly separable;
  the paraphrase call remains the product owner's and still blocks the notices file.
- **TBD-2 — scope change.** Not "confirm five licenses" but "confirm five licenses, **one
  (caveman) requiring path-level scoping in a resold bundle**" — MIT `skills/` only, BSL-1.1
  engine excluded, pinned to a commit (see the caveman bundle audit, tracked separately).
