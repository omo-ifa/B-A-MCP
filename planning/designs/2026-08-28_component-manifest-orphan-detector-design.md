# Component-manifest orphan detector (detector D5)

**One-line summary.** Teach `context_audit`'s `orphans` sub-score to recognize a per-component registry-manifest file (cal.com-style `DESCRIPTION.md`) as intentional layout, not abandoned rot — using the registry's own repeating structure as the signal, without reading source and without any path prefix.

---

## Motivation

`orphans` flags in-scope docs unreachable from any routing root. It exists to catch **genuine-abandoned rot**, not to penalize files a repo intentionally leaves unrouted. TBD-14 established that the overwhelming majority of orphan candidates on the pinned nine-repo corpus are accepted layout, and named an accepted class — `convention/runtime-discovered` — with four enumerated conventions. Detectors for two of them ship today (skill-discovery, agent-runtime config); **component-manifest (convention #3) was classified by hand in the TBD-14 re-validation but never mechanized in code.**

The consequence is a measurable, one-directional bias: on a repo with a large plugin registry (cal.com's app-store: ~110 `DESCRIPTION.md` files, one per plugin), `orphans` scores those 110 intentional files as rot, dragging the sub-score down (superset `orphans` = 31). That unmodeled downward bias is exactly why the `orphans` headline weight is pinned **provisional at 1** (TBD-10) — weighting it higher would push the bias into the headline. Mechanizing this detector removes one of the three bias sources (§4-gap) blocking the `orphans:1` → final raise.

**Which side it serves:** the developer running `context_audit` on a registry-shaped monorepo — today they see a deflated, less trustworthy `orphans` score and 110 findings that are all intentional. **Why now:** all three free tools ship and the free tier is feature-complete; sharpening the shipped `context_audit` is the fully-autonomous track, and this is the cleanest-bounded of the three remaining §4-gap items.

---

## Architecture

### Where it lives

One new detector, **D5**, added to `src/tools/context-audit/accepted-layout.ts`, joining the existing four:

| id | detector | recognizes |
|----|----------|-----------|
| D1 | `isRouteToDirNested` | route-to-directory (nested) |
| D2 | `isSkillDiscovered` | skill-discovery |
| D3 | `isAgentRuntimeConfig` | agent-runtime config |
| D4 | `isTightDatedArchival` | dated / versioned archival |
| **D5** | **component-manifest** | **per-component registry-manifest content** |

D5 is added to the `isAcceptedLayout` disjunction. Like D1–D4, it is **pure and structural** over the already-walked file list — no source read, no network, no I/O. Any detector firing means "not genuine-abandoned rot," so the doc is **excluded from the `orphans` numerator but remains a candidate and a finding** (unchanged contract).

### The signal: registry shape, not path

The detector keys on the **visible artifact of a registry glob** — a manifest set that *repeats* across sibling directories — never on a path prefix. A markdown doc is component-manifest iff **all** hold:

1. its basename is `description.md` (case-insensitive);
2. its parent directory also contains a `config.json` (case-insensitive);
3. its parent has a grandparent, and **≥ 3** of that grandparent's immediate child directories each contain **both** a `config.json` and a `description.md` (the parent itself counts toward the 3).

Condition 3 is the guard that preserves TBD-14's Ruling 2 (a visible false positive beats a silent false negative): a lone human `DESCRIPTION.md`, or a coincidental pair, never fires — it stays counted as a visible finding. Only a genuinely-repeating registry pattern nets.

### Data shape / interface

Inputs are the doc's relative path plus the set of already-known doc/file paths from the walk — the same material the other detectors consume. The precise internal form (a precomputed set of qualifying parent directories, mirroring `computeSkillDirs`, versus a per-doc test) is an implementation choice for the plan; the **contract** is: `(relPath, context) → boolean`, folded into `isAcceptedLayout`. `AcceptedLayoutCtx` may gain one precomputed set; no change reaches the tool's external surface.

### Surface changes

**None to the MCP contract.** No new field in the `tools/list` input/output schema. The `orphans` sub-score *value* changes on registry-shaped repos (the 110 net out); the schema shape does not. Therefore the context-budget ledger (rule 2) is unchanged, and `src/API.md` needs at most a prose touch to the `orphans`/`stats` description if current wording would otherwise mislead — no schema edit.

### Deliberately skipped

- **Test-harness-fixture mechanization** (§4-gap convention #4) — deferred to **TBD-25**. No source-free tight mechanism exists (the tool cannot see a harness glob); the only available rule is a path-prefix in disguise that swallows `MSW_USAGE_GUIDE.md`. Stays counted.
- **Bare-`docs/**` disposition** (the third §4-gap item) — deferred to **TBD-26**.
- **Raising `orphans:1`** — out of scope. This mechanizes one of three §4-gap items; the raise (TBD-10) waits on all three plus a corpus re-validation.
- **Widening the marker** beyond literal `config.json`, or **lowering the threshold** to ≥2 — allowed only by explicit future ruling (ratchet), never a silent heuristic.
- **The corpus re-validation run itself** — the close condition, its own later session under TBD-10. This design covers the detector, not the run.
- **Reading source** to confirm a registry glob — permanently out of scope for `context_audit` (stateless, file-tree-only by design).

---

## Decisions (from the Gate-2 ledger, verbatim)

Resolved in `planning/decisions/2026-08-28_component-manifest-detector-mechanism.md` (rows re-keyed L1–L13 to avoid collision with detector ids D1–D5):

- **L1** — This loop mechanizes component-manifest (convention #3) only.
- **L2** — Recognition basis: registry shape (parent is one of several sibling dirs each carrying the same manifest set). Not a lone sibling; not a path prefix.
- **L3** — Manifest set: a dir qualifies iff it contains **both** `config.json` and `DESCRIPTION.md`.
- **L4** — Only the `DESCRIPTION.md` in a qualifying dir is netted; a lone/non-repeating one stays counted.
- **L5** — "Several" threshold = **≥ 3** sibling dirs (owner-ratified 2026-08-28; visible-FP direction, smallest count proving a repeating registry, zero corpus cost). Raise-eligible to ≥2 only by explicit future ruling.
- **L6** — Marker file is literally `config.json`; widen only by explicit future ruling (ratchet).
- **L7** — Case-insensitive basename match (consistent with D2's `SKILL.md`).
- **L8** — Netting semantics: excluded from the `orphans` numerator, stays a candidate and a finding (identical to D1–D4).
- **L9** — Does **not** raise `orphans:1`; weight stays 1.
- **L10** — Close condition: categorical re-validation on the pinned nine-repo corpus (net the 110 cal.com residuals, net zero genuine-abandoned) — folds into TBD-10's pending re-validation.
- **L11** — No `tools/list` schema field added → ledger unchanged (rule 2); `src/API.md` prose touched only if wording shifts (rule 8).
- **L12** — Test-harness-fixture mechanization deferred → **TBD-25**.
- **L13** — Bare-`docs/**` disposition deferred → **TBD-26**.

---

## Docs affected

A list, not diffs:

- **`src/tools/context-audit/accepted-layout.ts`** — gains detector D5 and its wiring into `isAcceptedLayout` (the build's job, not this doc).
- **`src/API.md`** — `orphans` / `stats` prose reviewed; edited only if current wording would misdescribe the new netting (rule 8, same commit as the code if so).
- **`src/CONTEXT.md`** — context-budget ledger: re-confirmed unchanged (rule 2); no numeric edit expected.
- **`src/TDD.md`** — TBD-25 and TBD-26 already stubbed at Gate 2; no further change this loop.
- **`SESSION_HANDOFF.md`** — updated at `/handoff` to record the detector built and the remaining §4-gap items (TBD-25/26) still gating the TBD-10 raise.
- **`planning/decisions/2026-08-28_component-manifest-detector-mechanism.md`** — already written (Gate 2); the source of truth for the mechanism.
