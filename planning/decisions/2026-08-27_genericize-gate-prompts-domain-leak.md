# Decision — genericize the shipped gate prompts (remove Ebo Chart domain leak)

**Date:** 2026-08-27
**Type:** Product-quality fix (shipped prompts). No TBD.
**Status:** RESOLVED / applied.

---

## Decision

`prompts/intake.md` and `prompts/handoff.md` were templated from the sibling **Ebo Chart** dispensary project and never genericized. They hard-coded that project's domain into gates that B-A-MCP ships as a **generic** build-loop product. Both are now genericized: database/schema assumptions made **conditional**, and dispensary-specific vocabulary replaced with role-neutral terms.

---

## Context

The five gate prompts in `prompts/` are **the product** (CLAUDE.md: "the single source of truth for the gates"). They are meant to run inside any developer's Claude Code session, against any project. Surfaced 2026-08-27 when the owner asked whether `/intake` differs materially from `superpowers:brainstorming`; reading the prompt exposed the leak.

**Leak inventory (grep of `prompts/`, verified):**
- `prompts/intake.md` — `src/ERD.md`/"current schema" as a **required** read; "**new tables/columns … against the real ERD**"; "for which side (**consumer / dispensary / cultivator**)"; "RBAC … Data_Dictionary".
- `prompts/handoff.md` — "Confirm **`src/ERD.md`** and `src/API.md` match the code".
- `prompts/problem-fit.md`, `decisions.md`, `design-doc.md` — **clean** (the earlier grep's problem-fit hits were `ERD` matching inside "v**erd**ict").

**Two harms:** (a) B-A-MCP can't cleanly dogfood its own `/intake`/`/handoff` — it has no database, no `src/ERD.md`, and no consumer/dispensary/cultivator taxonomy (I hit this in this session's `/handoff` and had to route around "no ERD, no database"); (b) the product ships one client's cannabis-dispensary vocabulary as if generic.

---

## Options considered

- **Leave as-is** — rejected; ships a competitor-irrelevant domain and misfires on B-A-MCP's own use.
- **Strip all schema/data questions** — rejected; many target projects *are* database-backed, and losing the data-model question weakens the gate for them.
- **Make structure conditional + vocabulary neutral (chosen)** — keep the schema/data-model question but gate it on "if the project has one," and replace domain nouns (`consumer/dispensary/cultivator`, tables) with role-neutral ones (user/stakeholder, persistent state/records). Preserves the gate's rigor for DB-backed projects while fitting stateless ones like B-A-MCP.

---

## Changes

- **`prompts/intake.md`** — "Before asking" list: `src/ERD.md` demoted from a required read to "a data-model / schema doc (e.g. `src/ERD.md`) **if the project has one**"; `CONTEXT.md` softened to "or the project's conventions / routing doc"; the `RBAC / Integration_Spec / Data_Dictionary` parenthetical dropped for "any `planning/` doc the idea obviously touches". Procedure checklist: "for which side (consumer / dispensary / cultivator)" → "for which user or stakeholder"; "Data-model impact — new tables/columns … against the real ERD" → "State & data impact — persistent state / stored records / data shapes (if any), against the project's actual schema / contracts"; "screens, endpoints, tables, background jobs" → "interfaces, endpoints, files, records, or background jobs"; added "skip any that don't apply to this project".
- **`prompts/handoff.md`** — step 1: "Confirm `src/ERD.md` and `src/API.md`…" → "Confirm the project's schema-of-record docs — `src/API.md`, plus `src/ERD.md` **if the project has one** — match the code…".

Scope is exactly the two leaking prompts; the other three gates were verified clean.

---

## Consequences

- **Rule 1** (`prompts/` → `.claude/commands/` regeneration) is **not** triggered in practice: the generator is not built yet (Phase-1 checklist item still open, no `.claude/commands/` on disk). When that build step lands it will pick up the genericized prompts. No hand-edit of `.claude/commands/` (rule 1 honored).
- **Rule 8** (`src/API.md`) **not** triggered: API.md records prompt *names* and invocation, never bodies; no name or schema changed.
- B-A-MCP can now dogfood `/intake` and `/handoff` without the ERD/dispensary misfire.
- Methodology lesson logged as task-observer **Obs 29** (a copied template inherits its source domain; audit and genericize before shipping).
