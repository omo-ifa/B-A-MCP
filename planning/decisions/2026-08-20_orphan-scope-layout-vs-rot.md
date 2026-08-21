# Finding (OPEN) — orphans can score a layout choice, not a broken routing graph

**Date:** 2026-08-20
**Status:** OPEN — this records the evidence and the open question (TBD-14). No behavior changed.
**Relates to:** TBD-14 (orphan scope) · blocks orphans carrying weight in TBD-10.
**Evidence source:** run-4 audit of `superpowers` (`~/dev/ba-calibration/superpowers`, tool `da0f74a`).

---

## What the run showed

superpowers reported `orphans 0 / n61` — 61 candidate docs, none reachable from a routing root. Verified: all 61 files **exist on disk** (not resolver artifacts). But every one falls into a **structural** bucket, not routing rot. Exact counts:

| Bucket | Count | What they are |
|---|---:|---|
| `docs/**` | **43** | Archival documentation. **19** of these are dated plan/design docs under `*/plans/` (`docs/plans/*`, `docs/superpowers/plans/*` — e.g. `2025-11-22-opencode-support-design.md`, `2026-04-06-worktree-rototill.md`); the other 24 are design/reference/misc docs (`docs/README.kimi.md`, `docs/README.opencode.md`, `docs/porting-to-a-new-harness.md`, `docs/testing.md`, `docs/windows/*`, `docs/superpowers/**` non-plan). |
| `skills/*/**` | **18** | Skill **support files** inside skill directories (`skills/writing-skills/*` ×5, `skills/using-superpowers/*` ×5, `skills/subagent-driven-development/*` ×4, `skills/requesting-code-review/*` ×2, `skills/test-driven-development/*` ×2). Loaded by the skill system **via each `SKILL.md`, by directory convention** — never by a link from a router. |
| elsewhere | **0** | — |

## Why it matters

Neither bucket is rot:

- The `docs/**` archive is **dated historical plans + design notes** — a router has no reason to enumerate them, and shouldn't.
- The `skills/*/**` files are **convention-discovered**: the skill runtime loads them from the skill directory; they are structurally unroutable by markdown links **by design**.

So on this repo, `orphans` is scoring a **layout choice** (keep an archive under `docs/`; use directory-convention skill loading) as if it were a broken routing graph. `orphans 0` here is an **artifact**, not a measured defect. superpowers is a skills repo, exactly the shape where this misfires.

## Open question (TBD-14)

Should orphan scope **exclude** (a) convention-discovered files (e.g. files under a directory whose own `SKILL.md`/manifest loads them) and (b) dated archival directories (e.g. `**/plans/`, dated-filename docs)? **And if so, how are they identified without reading source contents** (the tool's hard constraint — it never inspects source)? Candidate signals, none decided: directory-name convention (`plans/`, `archive/`), dated filename patterns, presence of a sibling `SKILL.md`/manifest that enumerates the dir. Each risks a new false-negative class.

## Consequence / guard

- **Blocks:** `orphans` carrying weight in TBD-10 — its 0 on superpowers cannot be read as signal until scope is settled.
- **Do not fix on one repo.** Confirm the pattern across the four approved application repos (superset, posthog, cal.com, Ghost) — a multi-contributor app with a genuine archive vs. an app with real unlinked docs will separate "layout artifact" from "real orphan." The bucket counts above are the evidence; they exist only here.
