# icm-architect Scoping (Decision 11)

**Date:** 2026-08-18
**Author:** B&A Solutions
**Design doc:** `planning/designs/2026-08-18_ba-mcp-server-design.md` (Revision 2)

---

## Decision

`icm-architect` (RinDig, MIT) is bundled as the **workspace scaffolder**. It owns **generation** — describe a process, get an ICM workspace, validated once by a scaffold-time walk test. B&A's surface owns **governance** — the gate layer, continuous verification, the override record, and cross-session continuity, i.e. everything that happens inside the structure over time.

The boundary is load-bearing and stated as a rule: **B&A tools govern, they never generate.** It blocks future scope creep in both directions — B&A does not build a competing generator, and the scaffolder is not asked to govern.

## TBD resolved

None directly. This is a new scoping decision (Decision 11), not the resolution of a numbered TBD. It **escalates** TBD-2 and TBD-4 — see Consequences.

## Context

`icm-architect` is a 905-star, MIT-licensed, actively maintained expression of the same Interpretable Context Methodology (ICM; Van Clief & McDermott, 2026) that underlies B&A's method. Generation of an ICM workspace is therefore a solved and freely available problem. The open question was whether B&A should build its own scaffolder, ignore scaffolding entirely, or bundle the existing one — and, if bundled, how to keep it from cannibalizing the paid product.

## Options considered

1. **Build a B&A scaffolder.** Rejected — reinvents a 905-star free tool, adds no differentiation, and diverts effort from the governance layer that is actually B&A's product.
2. **Bundle nothing; leave generation to the user.** Rejected — the paid bundle's value proposition is convenience; omitting the obvious scaffolder makes the workspace harder to start for no gain.
3. **Bundle `icm-architect` as the scaffolder, with an explicit govern-vs-generate boundary.** Chosen — see Rationale.

## Rationale

- **Generation is a solved, free, 905-star problem.** Competing there adds nothing a buyer would notice.
- **The buyer pays for governance, not folder structure.** The gate layer (problem-fit that can stop an engagement, resolve-or-defer decisions, guidance-with-override), continuous verification (`doc_drift` re-running on every invocation, not once at scaffold time), the override record (`override_log` — who authorized proceeding past a known gap, and why), and cross-session continuity (`/handoff`) are all outside the scaffolder's scope and are what a regulated buyer pays for.
- **Bundling therefore does not undercut the paid product.** The scaffolder generates the structure once; B&A's surface governs it over time. Generation is a moment; verification is a subscription — and that line is also the free/paid boundary.

## Consequences

Four downstream effects, each explicit:

1. **Fifth bundled component.** `THIRD_PARTY_NOTICES.md` needs a new MIT notice block for `icm-architect` (name, author, license text, upstream URL, pinned version, modified/unmodified statement); `planning/Integration_Spec.md` §2 needs a new pinned-version row. Rule 4 binds these to the same commit.
2. **TBD-2 scope widened** from four bundled components to **five** — license confirmation now covers `icm-architect` as well.
3. **TBD-4 escalated.** `icm-architect` is a 905-star MIT expression of the same ICM paper (Van Clief & McDermott, 2026), now bundled. Whether B&A docs reproduce or paraphrase that expression must resolve **before the notices file ships and before any copy claims the methodology as B&A-original.**
4. **`doc_drift` scope widened.** It now carries both the schema-vs-code check and the orientation (walk-test) check — can a memoryless agent still orient in the workspace after drift — against the already-open TBD-9. The estimate risk is noted in the design doc's Sequencing section: if `doc_drift` resists, it cuts to Phase 2 and the free tier ships two tools; the scaffolder and gate layer are unaffected by that cut.
