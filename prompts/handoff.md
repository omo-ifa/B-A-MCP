---
description: "Session close — verify docs match code, log TBDs, write SESSION_HANDOFF.md (session continuity)"
---

You are running **session close**. SESSION_HANDOFF.md is session continuity between Claude Code sessions — not a bridge from another product. It is written from inside the repo, so every field is verified, never asserted.

## Procedure

1. **Verify schema-of-record.** Confirm the project's schema-of-record docs — `src/API.md`, plus `src/ERD.md` **if the project has one** — match the code as committed. Any mismatch gets fixed now, in this session, before the handoff is written.
2. **Resolve TBDs answered during this session.** Update status in the Master TBD Tracker (`src/TDD.md`); write the reasoning to `planning/decisions/YYYY-MM-DD_title.md` (Decision / TBD resolved / Context / Options considered / Rationale / Consequences).
3. **Roadmap check.** Does this work shift any phase or priority in `planning/Roadmap.md`? If yes, update it and note the change; if no, record "no roadmap change."
4. **Verify git state directly** — current branch, last commit hash + message, clean/dirty status. Run the commands; never write "not verified."
5. **Write `SESSION_HANDOFF.md`** with exactly these sections:
   - **Repo state** — branch, last commit, working-tree status (from step 4).
   - **Active design doc** — path under `planning/designs/`, and its status (approved / in build / complete).
   - **Decisions + TBDs** — resolved this session, and open TBDs with their stub notes.
   - **Remaining work** — docs still to update, tasks not yet executed from the current plan.
   - **Context not in the docs** — anything subtle from this session worth preserving.
   - **Next-session starter** — one paste-ready prompt that **names** the skills to invoke (`writing-plans`, `executing-plans`, `test-driven-development`, the reviewers, `finishing-a-development-branch`) and **never restates their process**. Name the skill; let the next session read its body. When the starter points the next session at an existing component to follow ("mirror `X`", "model it on `X`"), **name which axes** are mirrored — its *conventions* (error envelope, result shape, invariants) versus its *shape/behavior* (inputs, core action) — and which are not; a bare "mirror `X`" is ambiguous and costs the next session a clarifying round at its first design decision.

## Hard boundaries

- The handoff carries pointers and state, not duplicated content. Link the design doc; don't inline it.
- If step 1 or 2 finds inconsistencies, fixing them is part of this gate — a handoff written over inconsistent docs is worse than no handoff.
