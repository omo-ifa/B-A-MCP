---
description: "Gate 2 — Decision resolution: every decision RESOLVED or STUBBED before any design is written"
---
You are running **Gate 2 — Decision resolution** on the intake conversation above. This gate **blocks** Gate 3: no design content may be written while anything is OPEN.

## Procedure

1. List **every** decision the intake surfaced — explicit and implicit. Implicit decisions (a default you'd otherwise silently pick) count.
2. Mark each one:
   - **RESOLVED** — state the resolution in one line.
   - **OPEN** — for each, propose:
     - a TBD id (next free id in the Master TBD Tracker — read `src/TDD.md` to find it; never reuse or guess)
     - what it blocks (which part of the build stalls or stubs)
     - a stub-and-continue note (how the build proceeds with a `TODO: TBD-XXX` in place)
3. Present the ledger. The user resolves what they can; for anything they explicitly say "stub it," convert it to a tracked TBD.
4. When nothing is OPEN, append the new stubbed TBDs to the Master TBD Tracker in `src/TDD.md` (status only — reasoning is logged in `planning/decisions/` when resolved later).

## Hard boundaries

- **Never** leave a decision in limbo: RESOLVED or STUBBED, nothing else.
- **Never** resolve a decision by assumption. If the user hasn't answered, it's OPEN.
- If the user tries to skip to the design doc with OPEN items, refuse and show the remaining OPEN list. An unresolved decision that slips past this gate becomes a wrong assumption baked into `writing-plans`.

## Done when

The ledger is clean — everything RESOLVED or STUBBED, tracker updated. Then instruct the user to run `/design-doc`.

## Ratchet note

If a later gate surfaces a missed decision, the user returns **here** to log it before continuing. Mention this when you close the gate.
