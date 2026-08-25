# Decision — placeholder detection outranks the CommonMark `<dest>` strip, and what separates the two

**Date:** 2026-08-25
**Status:** Resolved (precedence rule + its discriminator; **docs only** — no code, no numbers)
**Decider:** B&A (product owner)
**TBD:** TBD-16 — remains Open
**Surfaced by:** the third review cycle on `docs/superpowers/plans/2026-08-24-routing-drift-precision.md`. Fourth ratchet trip on this design.
**Amends:** `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.2

---

## The collision

§3.2 rules that a template placeholder is not a path, in any syntax and any document type, and **names `<dir>` explicitly** as an example. The second plan review then added a CommonMark refinement — a `<…>` wrapper is a *link-destination delimiter*, not a blank to fill in — so that a genuinely broken `[x](<docs/gone.md>)` would not vanish silently. That refinement is correct, and the plan pins it with test T2d.

The two rules were never reconciled. Measured on the plan's own implementation:

| destination | placeholder? | outcome |
|---|:--:|---|
| `{name}` | true | excluded |
| `products/x/<dir>/AGENTS.md` | true | excluded |
| `chart:<chart_id>` | true | excluded |
| **`<dir>`** | **false** | **drifts** |

The strip consumes the angle brackets, leaving the bare path `dir`, so a destination §3.2 names as template text produces a finding while `{name}` does not. **And the `src/API.md` sentence the plan instructs the implementer to write names `<dir>` as an excluded example — so as written, the public contract would assert behaviour the code does not have.** That is the sharper harm: a contract that lies is worse than a rule that is merely inconsistent.

## D1 — Precedence: a bare `<token>` is a placeholder; a wrapped path is a delimiter

**Placeholder detection is adjudicated first.** A destination that is *entirely* a `<…>`-wrapped **token** reads as a placeholder and is excluded, consistent with §3.2's stated intent. A destination that is a `<…>`-wrapped **path** is a CommonMark delimiter: the wrapper is stripped and the path is adjudicated normally, so a broken one still drifts.

**This preserves T2d.** `<docs/gone.md>` is a path inside a wrapper, not a bare token — it strips and drifts, exactly as the previous cycle established.

### The literal reading is explicitly REJECTED

"Detection runs on the destination before the strip" must **not** be implemented as *"test the raw string for `<>{}` and skip the strip entirely."* That marks `<docs/gone.md>` a placeholder, excludes it, and **breaks T2d** — reintroducing the false-negative class the strip was added to close, and contradicting this ruling's own premise. Verified: under that reading every one of `<dir>`, `<chart_id>`, `<docs/gone.md>` and `<README>` returns "placeholder".

The precedence is about **which rule adjudicates a bare token**, not about deleting the strip.

## D2 — The discriminator: a slash or a trailing extension

A `<…>` wrapper is a **CommonMark delimiter** when its content **contains `/` or ends in a file extension**. Otherwise the wrapper is a **placeholder** and the destination is excluded.

| inner | verdict | why |
|---|---|---|
| `dir`, `chart_id`, `README` | **placeholder** — excluded | names nothing; a blank to fill in |
| `docs/gone.md`, `docs/gone` | **delimiter** — drifts | contains a slash |
| `my file.md`, `a.b` | **delimiter** — drifts | ends in an extension |

**Why this discriminator and not a narrower one.** Two alternatives were measured and rejected:

- **Slash only** — calls a wrapped **bare filename** a placeholder: `<README.md>`, `<CHANGELOG.md>`, `<a.b>` all lack a slash, so a genuinely broken link written that way is swallowed silently, recreating precisely the false-negative class this refinement exists to close.

  > **Correction (2026-08-25, from review cycle 4).** This bullet first argued the point from `<my file.md>`, on the reasoning that a spaced destination is the canonical reason CommonMark provides angle brackets. **That example does not reach this rule at all** — `extractLinks` classifies any destination containing whitespace as `malformed`, so it surfaces as `malformed_link` under every candidate discriminator (design §3.2's Scope paragraph already states `malformed_link` is decided earlier and is unaffected). **The ruling is unchanged** — slash-only is still rejected, and the bare-filename cases above are a stronger argument than the spaced one, being far likelier in a real router. Recorded rather than silently edited, so the rationale is not re-relied on in its wrong form.
- **Extension only** — calls `<docs/gone>` a placeholder, swallowing an extensionless path inside a wrapper. Narrower than the chosen rule with no compensating benefit.

All three candidates agree on every case the ruling names; they diverge only on `a.b`, `docs/gone` and `my file.md`, and on those the chosen rule is the one that never goes silent on something path-shaped.

**This is a code-shaped choice, and it is recorded here deliberately rather than settled inside an execution plan.** The plan's own ratchet says a decision the design leaves open goes to `/decisions`; this one did.

## Why precedence goes this way

- **Design intent is explicit and prior.** §3.2 names `<dir>` in its own text, and the run-6 evidence table names `<chart_id>` and `<dir>` together as the placeholder bucket. Ruling the other way would require amending the design's stated intent, not merely its mechanism.
- **The close condition is unthreatened.** Every markdown-link placeholder hit run-6 actually recorded was `chart:<chart_id>` or `chart:<id>` — partially-wrapped forms, excluded correctly under **both** readings. Nothing in the pinned corpus turns on this ruling, so it changes no measured number and no §3.5 class.
- **A bare `<token>` destination is vanishingly rare in real routers**, so the exposure either way is small — which is exactly why the tie should be broken in favour of the design's stated intent and a contract that tells the truth.

## Consequences

- **§3.2 is amended** to state the precedence and the discriminator explicitly.
- **The `src/API.md` `<dir>` example becomes true.** It currently would not be. **That text must not ship until this ruling lands** — a public contract asserting behaviour the code lacks is the failure this record exists to prevent.
- **The five mechanical plan fixes wait on this.** Review-cycle-3 finding 1 (the T2d red-state actual recorded against the wrong state) has a correction that depends on which way this went: under this ruling T2d's behaviour at the Task 1 stub state needs re-deriving, not merely re-labelling.
- **T2d survives** and still pins the `<dest>` false negative.
- **TBD-16 stays Open**, closing unchanged: the fix landing plus re-validation against the pinned nine-repo corpus under the categorical close condition.
- **No code. No number.** TBD-10/11/12 remain deferred; `TBD_10_WEIGHTS` and `ROUTING_LAYER_KEYS` untouched.

## Non-goals

- Does not re-litigate the CommonMark strip itself, tier-2 scope, the global placeholder ratification, or the exit criterion. Does not fix the five mechanical plan findings — those are plan-revision work, sequenced after this. Sets no threshold.
