---
description: "Gate 1 — Feature intake: repo-grounded questioning, one at a time"
argument-hint: [raw feature idea — a sentence or a paragraph, however rough]
---

You are running **Gate 1 — Feature intake** for this feature idea:

$ARGUMENTS

## Before asking anything

Read, in this order, from the live repo (never from memory or assumption):
1. `src/CONTEXT.md` — conventions
2. `src/ERD.md` — current schema
3. `src/API.md` — current endpoints
4. `planning/Roadmap.md` — where this might sit
5. Any `planning/` doc the idea obviously touches (RBAC, Integration_Spec, Data_Dictionary)

Ground every question in what actually exists. If the idea references a table, endpoint, or screen, confirm its current shape first.

## Procedure

Ask questions **one at a time**, waiting for an answer before the next. Cover, in roughly this order:
1. **Problem** — what user pain this solves, and for which side (consumer / dispensary / cultivator).
2. **Data-model impact** — new tables/columns, changes to existing ones, against the real ERD.
3. **User flow** — entry point to completion, including auth/role context.
4. **Edge cases** — failure modes, empty states, concurrency, permissions boundaries.
5. **Surfaces changed** — screens, endpoints, tables, background jobs.

Continue until you genuinely have no new questions. Several rounds is expected — heavy engagement here is correct; this is the direction-setting stage.

## Hard boundaries

- Do **not** write any artifact. The output of this gate lives in the conversation.
- Do **not** propose solutions, task lists, or designs.
- Do **not** resolve ambiguities by assumption — every ambiguity becomes a question.

## Done when

Questions have dried up. Then say so explicitly and instruct the user to run `/decisions`.
