# Design — `routing_drift` precision: the base-directory over-read

**A router path is drift only when it resolves NOWHERE — not when it resolves against a base the tool guessed wrong.**

**Date:** 2026-08-24
**TBD:** TBD-16
**Builds on:** `planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md` (D1–D5)
**Amends:** `planning/decisions/2026-08-20_router-path-drift.md` (the routing-path definition) · `planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md` §62.1 (two-base resolution)
**Amended by:** `planning/decisions/2026-08-24_d2-d3-superseded-before-implementation.md` — §3.4's exit criterion moves from *restore* to *confirm* (D2/D3 were never implemented, so no interim state exists to restore). Paired-coherence requirement unchanged.
**Amended by:** `planning/decisions/2026-08-25_placeholder-vs-commonmark-destination-precedence.md` — §3.2 gains the precedence of placeholder detection over the CommonMark `<dest>` strip, and the discriminator that separates a wrapped token from a wrapped path.
**Amended by:** `planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` — §3.1 (root-located routers get no tier 2), §3.2 (placeholder exclusion is global), §3.4 (drift `null` accepted when a router's whole reference set is unanchored), §3.5 (masked rot narrows to nested routers; new accepted-FP class).

> **Plan status (2026-08-25).** The implementation plan (`docs/superpowers/plans/2026-08-24-routing-drift-precision.md`) has been through three review cycles and **is not yet cleared for execution.**
> - **Cycle 1 — REJECT.** 2 CRITICAL + 1 IMPORTANT scope findings (all resolved by the amendments above) plus 11 mechanical.
> - **Cycle 2 — APPROVE WITH FIXES.** Fixes applied; the cycle also surfaced the CommonMark `<dest>` false negative, whose repair created the collision §3.2 now settles.
> - **Cycle 3 — FIXES INCOMPLETE**, plus the `<token>` precedence question that became `2026-08-25_placeholder-vs-commonmark-destination-precedence.md`.
>
> **Five mechanical findings from cycle 3 remain open and are sequenced AFTER this ruling** — finding 1's correction (a red-state actual recorded against the wrong state) depends on which way precedence went. **The `src/API.md` text the plan specifies must not ship until this ruling lands**, because it names `<dir>` as an excluded example, which is true only under this ruling. No `src/**/*.ts` has been written at any point.
**Status:** Design — WHAT & WHY only. No numbers, no code, no task breakdown.

---

## 1. Summary

`routing_drift` accuses a router of a broken route whenever a path-shaped span fails to resolve under either of the two bases the tool tries. Calibration run-6 measured that ~83 % of those accusations are wrong, dominated by a single mechanism: **router prose routinely describes a directory other than the router's own**, so the path is real but the base is not. This design corrects what "resolves" means, excludes template placeholders from being treated as paths in either link syntax, and settles the markdown-link disposition — restoring the sub-score to a state where it can honestly carry weight in TBD-10.

---

## 2. Motivation

### The problem, as a user meets it

A developer points `context_audit` at an inherited repo and is told its routers contain a dozen broken routes. They open one, find the file sitting exactly where the router said, and stop trusting the tool. The tool's entire claim is an *unfakeable diagnosis*; a check that is wrong five times out of six is worse than absent, because it spends the user's attention and their trust at the same time.

Run-6 measured this on the real corpus. Of **59** drift findings across the four repos that produce any:

| bucket | count | mechanism |
|---|:--:|---|
| **prose-relative** | **26** | target **exists**, under a directory the prose was describing |
| **placeholder token** | **10** | `<chart_id>`, `<dir>` — template text, never a path in any syntax |
| plausibly genuine | ~10 | real broken routes |

The canonical case: posthog's `products/signals/skills/AGENTS.md` documents each scout subdirectory in turn — *"the generalist keeps one progressively-disclosed reference, `references/conventions.md`"*. The tool joins that to the router's own directory, finds nothing, and reports a broken route. The file exists at `products/signals/skills/signals-scout-general/references/conventions.md`. The path was right; the base was invented.

### Which side this serves

The **free tier's credibility**, which is the whole distribution mechanism. `context_audit` is the tool a developer runs before they ever consider the paid record. A false accusation is the single most expensive output this tool can produce.

### Why now

This is the **loop gating TBD-10**. `routing_drift` carries the joint-highest stub weight, and Gate 2 ruled it cannot be weighted at ~17 % precision (`2026-08-24_routing-drift-precision-and-interim-disposition.md` D2). Two interim measures are in force because of it — a correctness-driven headline `null` and an `info` demotion — and **both are explicitly temporary, holding until this fix lands and is re-validated.** Nothing downstream of TBD-10 moves until this does.

---

## 3. Architecture

### 3.1 The corrected resolution: a third tier that is *not* an edge

Resolution today tries two bases (`2026-08-20_backtick-routing-edges-and-orphans-guard.md` §62.1): **doc-relative**, then **root-relative**. Failing both, a path-shaped span becomes `routing_path_missing`.

A third outcome is introduced between "resolves" and "drift":

| tier | condition | outcome |
|---|---|---|
| **1. Anchored route** | resolves doc-relative or root-relative | routing **edge** — unchanged |
| **2. Unanchored reference** | **new** — does not resolve under either base, but the path **does exist somewhere within the router's own subtree** | **not drift, and not an edge** |
| **3. Drift** | resolves under no base and exists nowhere in the router's subtree | `routing_path_missing` — unchanged |

**Why tier 2 creates no edge.** The tool cannot know *which* directory the prose meant — posthog's `references/conventions.md` could match under any of forty scout directories. Claiming a specific edge would be a guess, and that guess would propagate into `routedDirs`, reachability, `coverage` and `orphans` — three surfaces with open TBDs (TBD-12, TBD-14) whose numbers are actively being derived. So the tool does the one honest thing available: it declines to call the path broken, and declines to claim it knows what the router routes to.

An unanchored reference is excluded from **both** the `routing_drift` numerator and its denominator. The sub-score is then computed over the population it can actually adjudicate.

**The bounding constraint** on the subtree search is the router's own directory. A path is only ever unanchored *relative to the router that mentions it*; a repo-wide search would let any router excuse any path. The two hard invariants from `2026-08-20_backtick-routing-edges-and-orphans-guard.md` are untouched: never follow a symlink, never read above root.

**A ROOT-LOCATED router has no such bound, so it gets no tier 2 at all** (amended 2026-08-24 — `planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` D2). For a router sitting at the repository root, "the router's own directory" *is* the repo, and the bounding constraint above becomes vacuous: a bare filename would be excused by a same-named document anywhere. Observed — the identical prose span in a repo's root router and in a nested one received **opposite verdicts**, decided purely by which router carried it. For a root-located router, "somewhere in the repo" is not evidence that the prose meant any particular file. **Root-located routers are therefore strict anchored-or-drift, exactly as before this design. Nested routers keep tier 2 unchanged.**

> **Definition — read before implementing.** **"Root-located" means the router's `relPath` contains no `/`.** It does **NOT** mean `isRoot`. In this codebase **`isRoot` means "is a router doc," at any depth**, and the backtick branch is already gated on it — so implementing this exclusion as "skip tier 2 when `isRoot`" would make tier 2 **never fire, silently deleting the whole fix.** The predicate is about **location**, not router-ness.

**Measured cost, pinned corpus only:** of run-6's 26 prose-relative false positives, tier 2 still fixes **17** — every one of posthog's, the canonical case this design was written around — and gives back **9**, all from caveman's root `CLAUDE.md`. §3.5 names those 9 as an accepted class so the close condition still holds.

**The search is over the already-walked document set — NOT a fresh filesystem traversal.** `walk` has already enumerated every in-scope `.md` document once; tier 2 is a lookup against that existing set, filtered to the router's subtree. This is stated explicitly because the alternative reads as licence to re-walk: posthog's `products/signals/skills/` alone holds forty-plus scout directories, and a per-finding traversal would turn a read-only audit into repeated directory scans. Two consequences follow and are accepted:

- The corpus is the **walked doc set**, so tier 2 sees exactly what the audit sees. A tier-2 candidate is always a `.md` path (the shape test requires it), so the walked doc set is the right corpus by construction — no non-`.md` or directory targets are in question at this tier.
- Documents the walk deliberately excludes — gitignored paths, hard-skips — are **not** in that set, so a router path pointing at one reads as drift rather than unanchored. That is consistent with the tool's existing scope (out-of-scope files are not routes), not a new rule.

**Multiplicity is not a collision.** The match condition is **"at least one file exists in the subtree," not "exactly one."** Where the same filename survives under several sibling directories — the normal case in posthog, where many scout directories each carry a `references/` — every match is equally evidence that the path is real and the base is unknown. **Because tier 2 creates no edge, there is nothing to disambiguate:** the tool is not choosing a target, only declining to call the path broken. Ambiguity is the reason tier 2 exists, not an obstacle to it.

### 3.2 Template placeholders are not paths, in either syntax

Ten of the 59 findings are template text. The shape definition in `links.ts` (`isRoutingPathShape`) already excludes globs, home paths, env vars and package scopes on the reasoning that they *cannot be a doc route in any repo*. Placeholder-delimited spans belong in that same list by the same argument — `chart:<chart_id>` is not a path that failed to resolve, it is a form with a blank in it.

Two shape corrections, both of the definition and neither a filter:

- **Placeholder delimiters** join the excluded-marker set (brace forms are already excluded; the angle-bracket form is not).
- **A bare extension is not a path.** The current shape test accepts a literal `.md` with no stem, which is how prose sentences about file types become drift findings. A routing path needs something to name.

  **"No stem" is not "leading-dot segment."** The exclusion is about the **final** segment having no name before its extension — a span that is *only* an extension (`.md`, or a path whose last segment is `.md`). A leading dot on any segment is untouched: `.claude/CLAUDE.md`, `.github/copilot-instructions.md` and `.agents/CONTEXT.md` all name a file and remain valid routes. Dot-prefixed directories are ordinary and common in this population; excluding them would drop real routes, which is the opposite of this design's purpose.

**This applies to markdown links too, and that is what settles §3.3.** Markdown-link router drift currently has *no* shape test — any non-resolving link from a router is drift — which is exactly why posthog's two `chart:<chart_id>` hits fired. Placeholder exclusion is syntax-independent: a form-with-a-blank is not a route whether it was written in backticks or brackets.

**The exclusion is GLOBAL — it applies in every document, not only in routers** (ratified 2026-08-24 — `planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` D3). The reasoning above is independent of **both** the syntax the span was written in **and** the kind of document it appears in: a placeholder is not a path anywhere. Restricting it to routers would mean asserting that `templates/{name}.md` is a real broken link in a non-router doc and not one in a router, which is incoherent. So a placeholder span in an ordinary content doc stops producing a `broken_ref` as well (observed: `broken_ref` 2 → 1 on a doc carrying one placeholder link and one genuinely broken link — the real one survives).

**Scope:** the exclusion applies at the **edge-counting stage**. It does **not** reclassify `malformed_link` or `escapes_root`, which are decided earlier and are unaffected.

**Precedence over the CommonMark `<dest>` wrapper** (amended 2026-08-25 — `planning/decisions/2026-08-25_placeholder-vs-commonmark-destination-precedence.md`). CommonMark allows `<…>` around a link destination as a **delimiter**, which must be stripped so that a genuinely broken `[x](<docs/gone.md>)` is not silently swallowed. That refinement collides with this section for a destination that is *entirely* a `<…>`-wrapped token: stripping leaves a bare path and `<dir>` — named as template text in this very section — would produce a finding while `{name}` would not. **Placeholder detection is adjudicated first:**

| destination is… | verdict |
|---|---|
| a `<…>`-wrapped **token** (`<dir>`, `<chart_id>`, `<README>`) | **placeholder** — excluded |
| a `<…>`-wrapped **path** (`<docs/gone.md>`, `<my file.md>`, `<docs/gone>`) | **delimiter** — stripped, adjudicated normally, and a broken one still drifts |

**The discriminator:** the wrapper is a delimiter when its content **contains `/` or ends in a file extension**; otherwise it is a placeholder. A slash-only test was rejected because it swallows `<my file.md>` — a spaced destination being *the canonical reason CommonMark provides angle brackets* — and an extension-only test was rejected because it swallows `<docs/gone>`.

> **Do not implement this as "test the raw destination for `<>{}` and skip the strip."** That marks `<docs/gone.md>` a placeholder and reintroduces the false negative the strip exists to close. The precedence decides **which rule adjudicates a bare token**, not whether the strip exists.

**Implementation of the strip and the narrowed check** (amended 2026-08-25 — `planning/decisions/2026-08-25_commonmark-dest-strip-and-partial-wrap.md`, the fifth ratchet trip). The first build of this section shipped the discriminator but **not the strip**, and filled the partially-wrapped cases with a broad `/[<>{}]/` raw-string test — precisely the implementation the boxed warning above forbids. Two consequences were confirmed against the built code: a fully-wrapped `<path>` to an *existing* file drifted instead of resolving (no strip), and `[x](<docs/gone.md>#sec)` was silently swallowed (the broad fallback). This amendment makes the mechanism concrete:

- **The strip is real and placed at resolution.** For a markdown destination, adjudication is **placeholder-first, then strip-the-delimiter, then resolve**: once a fully-wrapping `<…>` is ruled a *delimiter* (not a placeholder), the wrapper is removed and the inner path is resolved and existence-checked normally. A fully-wrapped `<path>` to a file that **exists** therefore resolves to an **edge**; a broken one **drifts** — for the right reason, not because the unstripped literal also fails to exist. The placeholder-first order is what keeps `<dir>` from being stripped to the bare token `dir`.
- **The markdown-branch placeholder check is narrowed to enumerated forms.** The broad `/[<>{}]/` fallback is **dropped from the markdown branch**. That branch excludes only the forms observed to be placeholders: a **fully-wrapped token** (`^<…>$` whose inner names nothing — the discriminator's placeholder side) and the **`scheme:<token>`** form (`chart:<chart_id>`, `chart:<id>`, the shape run-6 recorded). **A destination matching neither is adjudicated normally, and if it does not resolve it drifts** — a stray bracket no longer excludes it. Between a **visible** false positive (the user sees the flagged line and corrects it) and a **silent** false negative (invisible to §3.4's close condition), a trustworthiness tool fails visible: the safe error direction cycle 2 settled.
- **Backtick paths are unaffected.** `hasPlaceholderToken` is still consumed by `isRoutingPathShape` for backtick routing paths, where `{`/`}` legitimately mark brace-glob placeholders and must keep excluding. The narrowing is to the **markdown** branch only.
- **Not generalised past the evidence.** Embedded/partial `<…>` groups beyond the enumerated set — multiple groups, empty `<>`, malformed nesting — are **not** defined here; a real corpus form the enumeration mishandles is a fresh `/decisions` trip (the flip-to-A condition), not a silent widening (rule 7).

### 3.3 Markdown-link drift: **KEEP**

The disposition Gate 2 authorised this loop to settle. Evidence: broken markdown links in routers have produced **zero** genuine findings across nine repos and six runs; the only two hits ever recorded were the placeholders above.

**Decision: keep the check, with §3.2's placeholder exclusion applied.** Reasoning:

- Once placeholders are excluded, md-link drift has **zero observed false positives** and zero observed true positives — it is a check with no measured error, not a check with a measured problem. Its cost is nothing.
- The population, not the check, is why it has never fired: **9/9 wild repos route via backtick paths, 0/9 via markdown links.** A check that cannot fire because the convention is absent is different from one that fires wrongly. If an inherited repo ever does route via markdown links, this is the check that catches it.
- **Demote or drop would be a policy fork, not a design call.** Either changes the scoring contract — the same class of change as removing `broken_refs` as a sub-score, which went through `/decisions` (`2026-08-20_broken-refs-removed-four-subscores.md`). Per the ratchet, this design does **not** bake that in. **Keep** is the option that requires no policy change, so it is the one a design gate may take.

If re-validation after this fix shows md-link drift producing false positives from some *other* mechanism, that is a new `/decisions` item, not a silent adjustment here.

### 3.4 Exit criterion — both surfaces CONFIRMED together

> **Amended 2026-08-24** — `planning/decisions/2026-08-24_d2-d3-superseded-before-implementation.md`. This section originally read *"the two restore triggers flip TOGETHER"* and required restoring `routing_path_missing` to `high`. **D2 and D3 were never implemented** — Gate 2 is docs-only, so the code never entered the interim state, and there is nothing to restore. A step saying "restore severity to `high`" against code already at `high` would be a no-op that completes without doing anything. **The paired-coherence requirement below is kept in full; only the mechanism changes — from *restore* to *confirm*.**

`2026-08-24_routing-drift-precision-and-interim-disposition.md` resolved two measures and stated they are **paired**. This design is complete only if landing it leaves **both** surfaces consistent:

| surface | ruling D2/D3 would have imposed had the fix been delayed | must be true after the fix |
|---|---|---|
| **Headline contribution** (D2) | `routing_drift` contributes a correctness-driven `null` | **scored-real whenever a scoreable population exists** — `null` only when a router's entire reference set is unanchored (see below) |
| **Finding severity** (D3) | `routing_path_missing` demoted to `info` | **`high`, confirmed never lowered** |

> **Amended 2026-08-24** — `planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` D1. This row originally required `routing_drift` to be scored-real, full stop. **The criterion was over-stated, not the behaviour.** Because tier 2 excludes an unanchored reference from the denominator as well as the numerator, a router whose **entire** reference set is unanchored leaves no population to compute a rate over, and the sub-score correctly reports `null` (observed: `score 25` → `score null` on three fixtures). That is an ordinary **data null** — `subscoreFromCount`'s existing `n === 0 → null` contract, the same logic as the D3 coverage guard — **not** the correctness-driven null D2 would have imposed, and it adds no new mechanism. With root-located routers excluded from tier 2 (§3.1), **only nested routers can empty a denominator at all.**

**A design that leaves one surface inconsistent with the other is an incomplete design.** They describe one condition — "is this measurement trustworthy" — read in two places, the headline and the finding list. A scored headline contribution alongside findings rendered at `info` would weight a signal the tool itself presents as low-confidence; full-severity findings alongside a null contribution would accuse users at full volume on a measurement the composite refuses to use. Either half alone is incoherent, however the state was arrived at.

**Both are asserted directly in the fix's own tests** — after the fix, `routing_path_missing` is `high` **and** `routing_drift` is scored — with no lower-then-raise anywhere. Materialising the interim state in order to revert it was considered and rejected: it manufactures history, shipping a state nobody runs so a record's tense stays true. This project corrects the record to match reality, never the reverse.

**Both confirmations are gated on the same event:** this fix landing **and** being re-validated against the pinned nine-repo corpus (`planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §0 — same commits, tool as the only variable). Re-validation is a calibration run, not a build step, and it is what closes TBD-16. **It is not a numeric bar** — no precision threshold is set here or anywhere (rule 7).

**The close condition is CATEGORICAL, not proportional.** TBD-16 closes when **every** residual `routing_drift` / `routing_path_missing` finding across the pinned corpus is classifiable into a class §3.5 names as out of scope, or is a verified genuine broken route. **Any single finding that fits neither goes to `/decisions`** — it is an unnamed mechanism, and an unnamed mechanism is exactly what run-6 found hiding behind a plausible-looking number.

This is deliberately stricter than "the residue is dominated by known classes," which was the earlier wording. *Dominated* is a proportion without a number attached, and a proportion without a number is a threshold waiting to be invented — it invites "precision looks good enough" at the moment the temptation is highest, which is the same failure as the rejected `6000`. **Every residual finding must be accounted for by name.** Counting is for the record; classification is the gate.

### 3.5 Deliberately skipped

The first entry is different in kind from the rest: everything below it is residue this fix **does not reach**, while the first is a class the fix **itself creates**. It is listed first because a cost the design introduces deserves more scrutiny than one it merely fails to remove.

- **Masked rot — the false negative this architecture INTRODUCES.** D5 warned that a widened resolution "risks a new false-negative class." This is it, named: **tier 2 silences a genuinely broken route whenever a same-named file happens to survive elsewhere in the router's subtree.** A router says `references/conventions.md`; the target it actually meant has rotted away; another scout directory's `references/conventions.md` still exists; the path is classified unanchored and the tool says nothing. A real defect, gone quiet.

  **Narrowed 2026-08-24 to NESTED routers only** (`planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` D2). Root-located routers no longer get tier 2, so they cannot mask anything — which removes by far the widest exposure this class had, since a root-located router's "subtree" was the entire repository.

  **Accepted, with the reasoning stated so it can be revisited.** The alternative is the status quo, which reports that same class of path as broken **26 times out of 59** when the file is sitting right there. Trading a rare silent miss for a frequent false accusation is the right direction for a tool whose entire claim is that its findings are trustworthy — a user who is lied to five times out of six stops reading the output at all, at which point the genuine findings are lost too. **But the trade is real and it is a loss, not a free win.** It is also structurally invisible: a false positive announces itself the moment a user opens the file, while this failure produces silence, so nothing surfaces it except a deliberate check.

  **Re-validation must EXPECT this class** rather than reading it as a new defect — and, because it is silent, must look for it actively rather than waiting for it to appear. Quantifying its real-world rate needs ground-truth knowledge of what each router *meant*, which the corpus cannot supply; if a later run finds it common rather than rare, that is a `/decisions` item, not a silent adjustment here.

- **Prose-relative spans under a ROOT-LOCATED router — an accepted false positive.** Added 2026-08-24 (`planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md` D2). Because root-located routers get no tier 2, a root router's prose describing a child directory still reports drift even though the file exists. **Measured on the pinned corpus: 9 of run-6's 26 prose-relative findings, all from caveman's root `CLAUDE.md`.** Accepted deliberately — the alternative is a bound so wide it excuses any path anywhere in the repo. **This entry is load-bearing for §3.4's categorical close condition:** without it those 9 would be unclassifiable at re-validation and would bounce the gate. Precedent for naming an accepted-FP class rather than special-casing it: `planning/decisions/2026-08-20_router-path-drift.md` §33 (icm-architect's template false positives). **Do not re-diagnose as a bug.**

- **Install-target paths.** Router prose describing where files land in the **consumer's** repo (`.windsurf/rules/…`, `.clinerules/…`, `.github/copilot-instructions.md`, `.claude/skills/…` in caveman). These genuinely resolve nowhere in the audited repo, so they remain drift under the corrected rule. Distinguishing "a path in another repo's layout" from "a broken route" needs prose semantics the tool does not have. **Named here so re-validation expects them** rather than reading them as a new defect.
- **Cross-repo references** (caveman's `agents/AGENTS.md`, `agents/CLAUDE.md` — a sibling repo). Same class, same reason.
- **Promoting unanchored references to edges.** §3.1 explains the deferral: it would move `coverage`, `orphans` and reachability while TBD-12 and TBD-14 are open. Revisitable once those settle.
- **Fenced-code-block awareness.** Still not tracked (`2026-08-20_backtick-routing-edges-and-orphans-guard.md` §73, and the standing limitation noted in `links.ts`). Out of scope here; it is also the prerequisite TBD-17 named for any future `@`-import support.
- **Any threshold or weight number.** TBD-10/11/12 untouched. `TBD_10_WEIGHTS` and `ROUTING_LAYER_KEYS` are not edited by this work — D2's restore is the sub-score reporting a real value again, not a weight change.
- **The TBD-11 bloat-aggregation loop and the TBD-14 dir-granularity loop.** Separately authorised, separately designed.
- **The `routing_drift` / `routing_path_missing` category split.** Reporting-level, unchanged; both still feed one sub-score.

---

## 4. Decisions

From the Gate 2 ledger (`/decisions` 2026-08-24), carried verbatim:

**RESOLVED — from `2026-08-24_routing-drift-precision-and-interim-disposition.md`:**

- **D1** — TBD-16 is scoped as **PRECISION + DISPLAY**, not a weighting question. At zero weight the ~49 incorrect flags still render; precision cannot be parked behind TBD-10.
- **D2** — `routing_drift` contributes **`null`** to the headline: a **correctness-driven null, not a data null**. Not resolved by assigning a weight later. Reuses the existing null-drop, weight-renormalisation and §5 guard untouched; **no weight-0 path invented** (weight 0 was measured and rejected — icm-architect 23 → 90, hygiene-only `bloat` carrying the headline).
- **D3** — `routing_path_missing` demoted to **`info`**, **interim and reversible**, on the TBD-13 precedent. `info` is **not** its permanent home; it returns to `high` on the restore trigger. Suppressing the category entirely was rejected.
- **D4** — **caveman-28 absorbed** into TBD-16; posthog reproduces every sub-class, so it was never caveman-specific.
- **D5** — the base-dir over-read fix **and** the md-link-drift disposition are authorised as **this** build loop. Treat the over-read as a **definition** problem, not a filter. Noted: *"add the described directory as a third base" is not obviously right* — it needs prose semantics and risks a new false-negative class.

**RESOLVED IN THIS DESIGN (architecture, within D5's authorisation):**

- **Tier-2 "unanchored reference" is not an edge** (§3.1) — the tool declines to call the path broken and declines to guess which directory was meant, keeping blast radius off `coverage`/`orphans` while TBD-12/TBD-14 are open. This is D5's warning honoured: the described directory is **not** adopted as a third resolution base.
- **Placeholder exclusion is syntax-independent** (§3.2) — a definition refinement, applying to markdown links and backticks alike.
- **Markdown-link drift: KEEP** (§3.3) — the only disposition available without a policy fork. Demote/drop would change the scoring contract and must go back to `/decisions`.

**STUBBED / still Open — unchanged by this design:**

- **TBD-16** stays Open until this lands **and** re-validation closes it.
- **TBD-10** (weights), **TBD-11** (bloat cutoffs), **TBD-12** (`MIN_FILES`), **TBD-14** (orphan granularity) — all numbers remain deferred. **No threshold is set here.**

**Ratchet:** if the build surfaces a decision this ledger missed, it returns to `/decisions` before continuing.

---

## 5. Docs affected

A list of documents and roughly how — **not** their diffs.

| Document | Roughly how |
|---|---|
| **`src/API.md`** | The MCP surface contract. Restate what makes a router path a route (the third tier), the placeholder exclusion, and `routing_path_missing`'s severity returning to `high` — **including the §3.5 masked-rot limitation**, since a user reading what this finding means is entitled to know what it can miss. No new document: this row already owned the third tier's semantics, and a tier's limitation is part of them. **Same commit as the code** (rule 8). |
| **`src/TDD.md` — TBD-16 row** | Status moves to Resolved once re-validated; record that both restore triggers fired together, with the closing evidence. |
| **`src/TDD.md` — TBD-10 row** | Drop the "blocked on TBD-16" gate; `routing_drift` becomes eligible for weighting. The weight **numbers** stay deferred, and `orphans` stays excluded pending its own loop. |
| **`src/TDD.md` — TBD-13 row** | **Unrelated one-line correction, folded into this loop:** the Status column reads `Open` while its Resolution text reads *RESOLVED (policy) 2026-08-20*. Status → **Resolved**. No scope of its own. |
| **`planning/decisions/2026-08-20_router-path-drift.md`** | Add a pointer noting its routing-path definition is amended here (the third tier + placeholder exclusion). The record itself is not rewritten. |
| **`planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md`** | Add a pointer noting §62.1's two-base resolution gains the third tier. |
| **`planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md`** | Record that D2 and D3 were restored together, and when. |
| **New calibration record** under `planning/calibration/` | The re-validation run against the pinned nine-repo corpus. It is what closes TBD-16, and it is **not** the README sample. |
| **`src/CONTEXT.md`** | Context-budget ledger — re-measure **only if** the tool description or schema changes (rule 2). This design changes neither; expected to be a no-op, verified not assumed. |

---

**Review this now — this is the last cheap correction point before it becomes code.**
