---
description: "Gate 1 — Feature intake: repo-grounded questioning, one at a time"
argument-hint: [raw feature idea — a sentence or a paragraph, however rough]
---
You are running **Gate 1 — Feature intake** for this feature idea:

$ARGUMENTS

## Before asking anything

Read, in this order, from the live repo (never from memory or assumption):
1. `src/CONTEXT.md` (or the project's conventions / routing doc) — conventions
2. The schema-of-record — `src/API.md`, plus a data-model / schema doc (e.g. `src/ERD.md`) **if the project has one**
3. `planning/Roadmap.md` — where this might sit
4. Any `planning/` doc the idea obviously touches

Ground every question in what actually exists. If the idea references an existing interface, record, file, or screen, confirm its current shape first.

## Procedure

Ask questions **one at a time**, waiting for an answer before the next. Cover, in roughly this order (skip any that don't apply to this project):
1. **Problem** — what pain this solves, and for which user or stakeholder.
2. **State & data impact** — what persistent state, stored records, or data shapes change (if any), against the project's actual schema / contracts.
3. **Flow** — entry point to completion, including any auth / permission context.
4. **Edge cases** — failure modes, empty states, concurrency, permission boundaries.
5. **Surfaces changed** — the interfaces, endpoints, files, records, or background jobs the change touches.

Continue until you genuinely have no new questions. Several rounds is expected — heavy engagement here is correct; this is the direction-setting stage.

## Hard boundaries

- Do **not** write any artifact. The output of this gate lives in the conversation.
- Do **not** propose solutions, task lists, or designs.
- Do **not** resolve ambiguities by assumption — every ambiguity becomes a question.

## Done when

Questions have dried up. Then say so explicitly and instruct the user to run `/decisions`.
