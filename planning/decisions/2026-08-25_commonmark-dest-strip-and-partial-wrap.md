# Decision — the CommonMark `<dest>` strip is implemented, and the markdown-branch placeholder check is narrowed to enumerated forms

**Date:** 2026-08-25
**Status:** Resolved (ruling + `§3.2` amendment + a follow-up plan task; **docs only** — no code, no numbers)
**Decider:** B&A (product owner)
**TBD:** TBD-16 — remains Open
**Surfaced by:** the post-implementation code review on the TBD-16 build branch (`fix/tbd-16-routing-drift-precision`, at `c88e506`). **Fifth ratchet trip on this design.**
**Amends:** `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.2 (and is bound by §3.4)

---

## The two defects

The precedence rule of `2026-08-25_placeholder-vs-commonmark-destination-precedence.md` (D1: placeholder detection first; a `<…>`-wrapped **token** is a placeholder, a `<…>`-wrapped **path** is a delimiter that is *stripped and adjudicated normally*; D2: the discriminator is slash-or-extension) was written as a ruling on the **entirely**-wrapped destination. Revision 3 of the plan implemented it as a single predicate `hasPlaceholderToken`:

```
const m = /^<(.*)>$/.exec(t);
if (m) return !(inner.includes("/") || /\.[a-z0-9]+$/i.test(inner));   // whole-destination discriminator (D2) — correct
return /[<>{}]/.test(t);                                                // fallback — the problem
```

Both defects were confirmed against the built code this session, not predicted:

1. **FN — a silent-swallowed broken link, introduced by this branch.** `[x](<docs/gone.md>#sec)` is not caught by the whole-destination regex (it does not end in `>`), so it falls to `return /[<>{}]/.test(t)`, matches on the stray `<`, and is excluded — `routing_drift: 0` where `main` reports `1`. That fallback is exactly the *"test the raw destination for `<>{}` and skip the strip"* that §3.2's boxed warning and the D1 record both explicitly forbid; it re-entered through the plan as the catch-all for partially-wrapped forms. A broken link that vanishes is the direction §3.4 prohibits absolutely.

2. **FP — a false accusation, pre-existing at `main` but which D1 says to fix.** `[x](<src/API.md>)` pointing at a file that **exists** is reported as `routing_drift` rather than resolving to an edge, because **D1's mandated strip was never implemented**. `hasPlaceholderToken("<src/API.md>")` correctly returns *not a placeholder* (slash → delimiter), but nothing then strips the wrapper, so `classifyLink` resolves the literal string `<src/API.md>`, which fails `existsSync`, and it drifts. This is the exact false-accusation class the whole design exists to remove.

**And T2d passes vacuously.** The one test that pins the broken-wrapped case, `[x](<docs/gone.md>)` → `routing_drift: 1`, is green — but for the wrong reason: with no strip, the *unstripped* literal `<docs/gone.md>` also fails `existsSync` and drifts. The intended mechanism (strip → resolve → miss → drift) and the bug (no strip → literal → miss → drift) produce the identical outcome on that input, so the green bar certified an outcome while the mandated mechanism did not exist. Four plan-review cycles read past it; only a discriminating input — a wrapped path to an *existing* file, where the two mechanisms diverge — exposed it. (Recorded as task-observer observation 15.)

## D1 — Implement the strip; a fully-wrapped `<path>` to an existing file resolves as an edge

The strip D1 already mandated is made real. In the resolution flow, **after** placeholder adjudication has ruled a destination a *delimiter* (not a placeholder), a fully-wrapping `<…>` is removed and the inner path is adjudicated normally:

| destination | placeholder? | after strip | outcome |
|---|:--:|---|---|
| `<dir>` | yes | — | excluded (placeholder) |
| `<docs/gone.md>` | no (delimiter) | `docs/gone.md` | resolves nowhere → **drift** |
| `<src/API.md>` (exists) | no (delimiter) | `src/API.md` | resolves → **edge**, no drift |

This fixes the FP and makes T2d non-vacuous: the wrapped broken path drifts *because it was stripped, adjudicated, and found missing* — not because the literal also failed to exist.

**Strip placement.** The strip belongs at the point of resolution for a markdown destination, gated behind the placeholder adjudication so a `<token>` is never stripped (stripping `<dir>` would leave the bare token `dir` and defeat the exclusion). Placeholder-first, then strip-the-delimiter, then resolve — the order D1 fixed and this record does not disturb.

## D2 — Narrow the markdown-branch placeholder check to enumerated forms; an unenumerated form defaults to drift

The broad `/[<>{}]/` fallback is **dropped from the markdown branch**. In its place, the markdown-branch placeholder check recognises only the forms actually observed to be placeholders:

- a **fully-wrapped token** — `^<[^/]*>$` whose inner names nothing (no slash, no extension), i.e. the D2 discriminator's placeholder side; and
- a **`scheme:<token>`** form — the `chart:<chart_id>`, `chart:<id>` shape that run-6 actually recorded.

**Any destination matching neither is adjudicated normally** — which, if it does not resolve, means it **drifts**. A stray `<`, `>`, `{`, or `}` in a destination no longer excludes it.

**Why "default to drift" is the safe direction.** A form the enumeration does not cover becomes a **visible** false positive — the user opens the router, sees the flagged line, and corrects the tool's understanding or the doc. That is the error direction the chain settled in cycle 2 (`2026-08-24_tier-2-scope-and-placeholder-globality.md`): between a visible false positive and a silent false negative, a tool whose entire claim is trustworthiness must fail visible. A silent false negative is invisible to §3.4's categorical close condition by construction; a false positive announces itself.

**Note on scope.** `hasPlaceholderToken` is also consumed by `isRoutingPathShape` for **backtick** routing paths, where `{`/`}` genuinely mark brace-glob placeholders (`a/{x,y}/z.md`) and must keep excluding. The narrowing is to the **markdown branch's** use of the predicate, not to the backtick shape test. The follow-up task must preserve the backtick behaviour (the existing `graph.test.ts` non-route-tokens fixture and T1d still pass) while removing only the markdown branch's over-broad exclusion.

## The alternatives, and why they lost

**Option B — name the branch-introduced FN a §3.5 accepted class. Rejected.**
§3.5 enumerates *residue the fix does not reach* — prose-relative-under-root, install-target, cross-repo — classes that exist independently of this work. The FN is not residue; it is a **regression this branch creates**. Filing a self-inflicted silent-swallow under §3.5 would launder a new defect into an accepted limitation. Its supporting argument — "corpus-invisible, md-link drift has zero genuine hits in nine repos" — is the **absence-of-convention** argument, and §3.3 already ruled what that argument means: a check that has never fired *because the convention is absent* is **kept**, against the day an inherited repo does route that way, not weakened. Accepting the FN would read §3.3's own evidence backwards. Contradicts §3.3 and §3.4.

**Option A — generalise D2's slash-or-extension discriminator to *any* `<…>` group, embedded ones included. Rejected.**
D2 was written for the **whole destination** (`^<…>$`). Extending it to any embedded `<…>` group leaves the domain the ruling actually covers and opens questions the design does not settle: a destination with **multiple** `<…>` groups, an **empty** `<>`, **malformed nesting** (`<<x>>`, `<a<b>c>`). It presents as a simplification — "one rule everywhere" — but it is a scope expansion that would itself need a fresh definition pass to close honestly, i.e. another `/decisions` trip disguised as an implementation detail. Absent evidence that the pinned corpus **contains** such embedded-group placeholder forms, generalising is a rule-7 speculative addition — inventing a definition ahead of the data, which is the failure this whole chain has been guarding against.

**Flip-to-A condition (recorded).** If a later calibration run shows the pinned nine-repo corpus contains embedded-group placeholder forms that C's enumeration mishandles — a real `<…>`-inside-a-larger-destination placeholder the tool now drifts on wrongly — then C's enumeration is under-fitted to the evidence, and the generalisation A proposes earns its definition pass. That is a **new** `/decisions` trip triggered by data, not a standing option to reach for now.

## Consequences

- **§3.2 is amended** to state the strip's position in the resolution flow (placeholder-first, then strip-the-delimiter, then resolve) and to replace "the discriminator adjudicates the destination" with the narrowed, enumerated markdown-branch check plus the default-to-drift rule for unenumerated forms. The boxed warning stands and is now actually honoured by the mandated implementation.
- **A follow-up task is added to the plan** (`docs/superpowers/plans/2026-08-24-routing-drift-precision.md`) implementing C under `superpowers:test-driven-development`, **stacking on the three committed tasks** (`3646391`, `c5677f7`, `c88e506`). It carries two hard constraints:
  1. **The FN fix is non-negotiable.** The branch must not merge while a broken link can silently vanish (§3.4). `[x](<docs/gone.md>#sec)` and its kind must drift.
  2. **T2d must be made non-vacuous.** It must pass because the wrapped path is stripped, adjudicated, and drifts for the right reason. The task must include the mutation check: **removing the strip must make T2d fail.** A test green under both mechanisms verifies neither (observation 15).
- **`src/API.md`** updates in the **same commit** as the follow-up code if the narrowed behaviour changes the public contract text (rule 8) — decided by content in that task, not here.
- **TBD-16 stays Open**, closing unchanged: the fix landing plus re-validation against the pinned nine-repo corpus under the categorical close condition.
- **No code in this pass. No number.** TBD-10/11/12 remain deferred; `TBD_10_WEIGHTS` and `ROUTING_LAYER_KEYS` untouched.

## Non-goals

- Does not re-litigate the precedence itself (D1 of the prior record), tier-2 scope, the global placeholder ratification, or the exit criterion. Does not add fenced-code-block awareness. Does not generalise beyond the enumerated markdown placeholder forms — that is the flip-to-A condition's job, on evidence. Sets no threshold.
