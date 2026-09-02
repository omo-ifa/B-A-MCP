---
description: "Gate 0 — Problem-fit: is AI the right tool at all? Four questions; a low score can end the engagement."
argument-hint: [the problem or idea you're weighing AI for — a sentence is enough]
---
# /problem-fit — Gate 0

**Stage:** 0 · Fit (runs before `/intake`)
**Job:** Decide whether AI is the right tool at all — before any scoping, planning, or building.
**Gate mode:** Guidance with explicit override. This gate can end the engagement.

---

You are running **Gate 0 — Problem-Fit** on this idea:

$ARGUMENTS

*(If nothing appears above, ask the person for the idea in one line before starting.)*

## Why this gate exists

Every other gate in the loop assumes the work is worth doing and asks *how*. This one asks *whether*. It is the only gate whose verdict can be "stop."

Most failed AI projects don't fail on technology. They fail because the work ran on knowable rules, the examples a system would need never existed, or errors were intolerable. A high-readiness team that skips this check is simply well-organized to buy the wrong thing — which is worse than not being ready, because they'll actually do it.

Four questions. A person answers each 0, 1, or 2. The subtotal is out of 8. A low subtotal overrides everything downstream.

---

## How to run it

Ask the four questions **one at a time**, in order. After each, restate the chosen score in plain language so the person can catch a misread before moving on. Do not preview later questions. Do not soften a question to make a "yes" easier — the value of this gate is that it is honest.

For each question: read it, read its 0 / 1 / 2 guide, and record the score the person's actual situation earns *today* — not what's planned, not what's almost done.

### Q1 — Judgment over messy inputs

> Does the work involve judgment over messy inputs (text, conversations, images, documents) rather than fixed rules?

- **0** — No. Structured inputs, knowable rules.
- **1** — Mixed. Some judgment, some rules.
- **2** — Yes. A person currently reads, interprets, or judges messy material.

### Q2 — Have you ruled out the boring fix

> Have you checked whether a checklist, template, or simple automation could solve it instead?

- **0** — Haven't checked.
- **1** — Briefly considered, never tested.
- **2** — Tried the simple route; the variation defeats fixed rules.

### Q3 — Do the examples exist

> Do you have real examples of the problem (emails, tickets, documents, recordings) a solution could learn from or be tested against?

- **0** — No, or scattered and unretrievable.
- **1** — Some, with effort.
- **2** — Dozens or more, retrievable this week.

### Q4 — Can it tolerate a wrong answer

> Can this task tolerate an occasional wrong answer, caught by human review?

- **0** — No. An error is catastrophic (legal, medical, financial, safety).
- **1** — Errors painful but survivable with careful checking.
- **2** — A person reviews output; mistakes are cheap to catch.

---

## The verdict

Sum the four scores (0–8).

- **7–8 — Fit.** AI is a plausible tool for this problem. Proceed to `/intake`.
- **3–6 — Weak fit.** AI *might* fit, but at least one foundation is missing. Name which questions scored low and what each low score implies before proceeding. Proceeding is allowed, but it is an override (see below).
- **0–2 — This isn't an AI problem.** The honest answer is that AI is the wrong first move. This is the most valuable result the gate can give. Proceeding from here is a hard override and must be logged as one.

> Note on the boundary: the paid AI Readiness Scorecard scores these same four questions doubled, out of 16, and triggers its red outcome at ≤6 of 16. This teaser uses the raw 0–8 subtotal. It is a directional check, not the full diagnostic — say so.

---

## Gate behavior: guidance, not a hard stop

This gate never silently refuses to advance. When the score is weak (≤6) or failing (≤2), it does three things, in order:

1. **States the specific risk.** Not "you're not ready" — the actual implication. Examples:
   - Low Q1 → "The work looks rule-shaped. A model would be doing, expensively and unpredictably, what a decision table does for free."
   - Low Q2 → "The simple fix hasn't been ruled out. You may be about to build a model to do a checklist's job."
   - Low Q3 → "There's nothing to learn from or test against. You can't measure whether a solution works, because there's no ground truth to measure it on."
   - Low Q4 → "Errors here are not survivable. Automation adds a failure mode before you've added the human safety net that would catch it."
2. **Names the cheaper move first.** A checklist or automation rule for a low Q1/Q2. Start collecting raw material for a low Q3. Add review steps and approvals before automation for a low Q4.
3. **Requires a deliberate override to continue.** If the person still wants to proceed, that is their call — but it is recorded: *proceeded past Problem-Fit at score N/8, low on [questions], acknowledged risk [X], on [date].* The loop continues around the caveat rather than stopping at it.

The override is the artifact. A gate that just stopped would record nothing. A gate that informs and logs the decision to proceed keeps the efficiency and produces the audit trail.

---

## What this gate hands to `/intake`

- The four scores and the subtotal.
- The verdict band.
- Any override taken, with its risk statement — so `/handoff` can carry it into the final record.

If the verdict was "this isn't an AI problem" and no override was taken, the loop ends here. That is a successful run of this gate, not a failure.

---

*Gate 0 of the B&A build loop · based on Interpretable Context Methodology (Van Clief & McDermott, 2026) · guidance-with-override gate model. Questions adapted from the AI Readiness Scorecard (Bobb Alexander Solutions). The full 24-question diagnostic is the paid Scorecard; this is a four-question teaser.*
