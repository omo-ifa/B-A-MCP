---
description: "Gate 3 — Design doc: WHAT & WHY only, written directly to planning/designs/"
---

You are running **Gate 3 — Design doc**.

## Precondition (verify, don't trust)

The Gate 2 ledger must be clean. Scan the conversation: if any decision is still OPEN, stop and send the user back to `/decisions`. Do not proceed.

## Procedure

Write **one** file directly to the repo:

`planning/designs/YYYY-MM-DD_<feature-slug>-design.md`

(today's date; slug derived from the feature name, kebab-case)

Fixed shape — exactly these sections:

1. **Title + one-line summary**
2. **Motivation** — the user problem, which side(s) it serves, why it's worth doing now.
3. **Architecture** — components, interfaces, data shape, surface changes. Must include a **"Deliberately skipped:"** subsection listing explicit out-of-scope items.
4. **Decisions** — the resolved decisions and stubbed TBDs from Gate 2, verbatim from the ledger.
5. **Docs affected** — which suite docs will change and roughly how. A **list**, not diffs.

## Hard boundaries

- **No** task breakdown, **no** tests, **no** code, **no** doc diffs. Those belong to `superpowers:writing-plans` and `executing-plans`. If you find yourself writing a numbered implementation sequence, delete it — that's the build phase's job.
- "Docs affected" *names* documents; it never writes their changes.
- If writing the doc surfaces a decision the ledger missed: **stop**, tell the user, return to `/decisions`. Never resolve it silently here.

## Done when

The file is written and you have told the user: **review it now — this is the last cheap correction point before it becomes code.** Do not invoke `writing-plans` or any build skill until the user explicitly approves the design doc.
