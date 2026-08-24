# Decision — no new router syntax or filename in v1 (TBD-17 RESOLVED)

**Date:** 2026-08-24
**Status:** **Resolved** — TBD-17 closed
**Decider:** B&A (product owner)
**TBD:** TBD-17 (opened 2026-08-24 by calibration run-6; resolved same day)
**Evidence:** `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §6
**Relates to:** `planning/decisions/2026-08-20_agents-md-router-recognition.md` D7 (`AGENTS.md` only; speculative names are a rule-7 guess)

---

## Why

Run-6's structural pre-flight ran **before** any number was treated as data — including on repos already audited, since the `AGENTS.md` fix changed what "visible" means. It surfaced three routing conventions the parser does not read. Each was **measured**, not assumed, and the measurement is the decision.

The bar this must clear is the one `AGENTS.md` cleared: `AGENTS.md` was promoted to a v1 correctness fix because it made the root routing layer **structurally invisible on 4 of 4 application repos**, turning every sub-score into an artifact. **None of the three below is remotely that.**

### (a) `@`-import lines (`@./path`, `@path`)

The Claude Code / Gemini CLI context-import syntax — arguably the strongest routing edge that exists, since it is a literal import rather than a reference. It is also the most tempting to add. The measurement does not support it:

- Across all nine repos, recognised routers contain **7 genuine `@`-import edges**: posthog `posthog/egress/AGENTS.md` → `@README.md`, `products/engineering_analytics/AGENTS.md` → `@SPEC.md` + `@README.md`; caveman root `AGENTS.md` → 4× `@./skills/*/SKILL.md`.
- Against caveman's **385** and posthog's **431** resolved router references, that is **4 and 3 additional edges** — noise, not signal.
- **The parse is hazardous.** A naive `^@` rule eats Python decorators: superset's `superset/mcp_service/CLAUDE.md` alone carries **11** `@tool(` / `@prompt(` / `@mcp.resource(` / `@pytest.fixture` lines inside fenced code blocks, and posthog has `@action(...)`. Any rule would need to exclude fenced blocks **and** require a path shape — and `2026-08-20_backtick-routing-edges-and-orphans-guard.md` §73 explicitly records that this tool **does not parse fenced code blocks specially**. Adding `@` support means adding fence-awareness first.
- Net: near-zero yield, meaningful new false-positive surface, and a prerequisite the parser does not have.

### (b) `GEMINI.md` at root

Present in 3 of 9 repos, but the presence is misleading:

- **superset's is a symlink → `AGENTS.md`** — already handled. D2's symlink-alias dedup suppressed it correctly, along with a `GPT.md → AGENTS.md` symlink beside it. (Worth recording: run-6 is the first observation of D2 deduping aliases it was not specifically designed against, in both directions — superpowers ships `AGENTS.md → CLAUDE.md`, the reverse of the app repos.)
- The only two **real** `GEMINI.md` files are **92 B** (superpowers) and **131 B** (caveman), and contain *nothing but* `@`-import lines pointing at skills already routed from `CLAUDE.md` / `AGENTS.md`.
- Recognising `GEMINI.md` would therefore add **approximately zero** signal — and what little it carries is in syntax (a) above, which is itself rejected.

### (c) `Ghost/CONTEXT-MAP.md`

A genuine hub router (1 027 B) listing three `CONTEXT.md` files via `Path: \`…\`` backticks. But **the tool already finds all three of those `CONTEXT.md` files directly**, so recognising the hub would add **3 edges to Ghost's 34**. 1 of 9 repos, near-zero yield.

## Decision

**Add no new router filename and no new link syntax in v1.** `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` remain the complete router-name set; markdown links and backtick code-span paths remain the complete edge syntax.

This is **rule 7 and D7 applied to measured evidence rather than to a guess**. The earlier D7 ruling ("do not add `GEMINI.md`, `.cursorrules`, or any other speculative name until a run shows the repo population using it") set the condition. Run-6 is that run, and the answer it returns is **no** — the population does carry these conventions, but at a yield that does not justify the parse risk.

### What would reopen this

A future calibration run showing a convention that (i) carries a **material share** of a repo's routing edges, not a handful, **and** (ii) can be parsed without a new false-positive class. `@`-imports specifically become reconsiderable if the parser gains fenced-code awareness for another reason — the yield would still need to have grown.

## Consequences

- **No code change.** `walk.ts`'s router-name set and `links.ts`'s extractors are untouched. Nothing to update in `src/API.md`.
- **The measurement is recorded so it is not re-litigated.** A future session encountering `@./path` in a router will find the count (7 across nine repos), the decorator collision, and the fence prerequisite here rather than re-deriving them or guessing.
- Also recorded from the same pre-flight: superset ships **three** root aliases to `AGENTS.md` (`CLAUDE.md`, `GEMINI.md`, `GPT.md`), and D2 correctly emitted no `symlink` finding for any of them.
- **TBD-17 is closed.** Removed from the open set; the tracker row carries the resolution.

## Non-goals

- Does not touch the `AGENTS.md` recognition ruling, the symlink-alias dedup, or the strict path-shape definition. Sets no number. Does not decide the md-link-drift disposition — that belongs to TBD-16.
