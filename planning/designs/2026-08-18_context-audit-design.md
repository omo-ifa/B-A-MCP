# Design Doc — `context_audit`

**Date:** 2026-08-18
**Status:** Approved — 2026-08-18 (design-review pass ruled three leaf clarifications in §3: non-file finding `file`, MCP result shape, case-insensitive basename match; no Resolved decision or stub reopened)
**Author:** B&A Solutions
**Feature:** `context_audit` (Phase 1, free tool #1 — the acquisition hook)

---

## 1. Summary

A free, keyless, read-only MCP tool that audits a repository's **routing layer** — the `CLAUDE.md` / `CONTEXT.md` tree — and returns a scored, unfakeable diagnosis of routing bloat, orphan docs, broken references, routing drift, and documentation coverage gaps. It reads the user's real files locally, never writes, and never inspects source-file contents.

---

## 2. Motivation

**The problem.** A repository's context layer rots silently. Routing files bloat with inlined content that should be routed elsewhere; docs become orphaned when nothing points to them; routers reference paths that no longer exist; whole workspaces end up with no router at all. Every one of these failures is invisible — the repo still builds, the tests still pass — but the agent gets sent to the wrong doc, or to none, and the developer pays for it in tokens and in accuracy on every session.

**The win, in priority order (load-bearing).**
1. **Agent accuracy.** Misrouting is the actual pain. Bad routing sends the agent to the wrong context or leaves it guessing, and the failure is silent.
2. **Token cost.** The measurable proxy that gives the score a number — how the problem becomes legible — not what the score is for.
3. **Credibility.** B&A's outcome, never the user's. It drives the developer toward B&A but never appears in the rubric.

That ordering is why the rubric penalizes **gaps as well as excess**: if token cost led, a repo with zero context docs would score perfect, and the tool would be silent for exactly the user with the worst problem.

**Which side it serves.** The free tier. The target user is a developer auditing a repo they are actively working in — whether they wrote it or inherited it. Inherited-repo triage comes free from the same behavior; there is no second mode.

**Why now.** `context_audit` is the most bounded of the three free tools and the acquisition hook's actual front door. Its credibility rests on a single claim — *unfakeable, because it reads your real files* — which every downstream surface (README, `export_record`, the consulting funnel) depends on. It is the first tool to build once the server scaffold exists.

---

## 3. Architecture

### Shape

A pure MCP **tool** (not a prompt), invoked by the model when a developer asks to audit their context. Stdio, local, free, unauthenticated. No prompt/slash wrapper — prompts are the method (the gates), tools are the reads. No request ever reaches B&A infrastructure.

### Input & root resolution

- One optional `path` parameter, defaulting to the server's working directory.
- **Two-tier resolution:** resolve upward from the given path to the nearest `CLAUDE.md` and treat that directory as root; if none is found before the filesystem root, fall back to the nearest git root (`.git/`); if there is no git repository either, use the given path.
- The returned `root` field carries **how** it was determined (`claude_md` / `git_root` / `given_path`), because a git-root or given-path audit is a weaker claim than a `CLAUDE.md`-anchored one and the record must say so.
- The tool never audits a subtree while believing it is the whole repo. In a monorepo, the reported root names exactly what was audited.

### The walk

Enumerate in-scope docs under the resolved root:
- **Scope:** markdown only for v1 — `.md`, plus `AGENTS.md` and `CLAUDE.md` by name.
- **Filename matching is case-insensitive on the basename.** The structural names (`CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`), the repo-furniture orphan denylist, and the `.claude/commands/` skip all match by basename case-insensitively, so the tool scores identically on a case-insensitive filesystem (macOS, the build platform) and a case-sensitive one (Linux CI). Where a case-sensitive filesystem holds two distinct files whose basenames collide under one structural name (e.g. `CLAUDE.md` and `claude.md` in one directory — impossible on a case-insensitive FS), both are treated as roots — their union only adds reachability and drift checks, never hides a finding — and an `info`-severity finding records the collision. Determinism holds via the normalized (sorted) path ordering already required below.
- **Respect `.gitignore`.**
- **Hard-skip regardless:** `.git/`, `node_modules/`, `dist/`, `build/`, `vendor/`, `.venv/`, `target/`, and any dotdir except `.claude/` and `.github/`.
- **Skip `.claude/commands/`** — generated from `prompts/`; reading it as authored routing double-counts.
- **Never follow symlinks.** A symlink pointing at something in scope is recorded as a finding, not traversed.
- **Never read a byte above the resolved root** — a hard invariant.

### The reference graph

- **Nodes:** in-scope docs. **Edges:** relative markdown links. **Roots:** `CLAUDE.md` (including nested `CLAUDE.md` in monorepo sub-packages) and every `CONTEXT.md`.
- External links (`http(s)://`, `mailto:`), and bare anchors (`#section`) are ignored — not edges. A path with an anchor (`planning/CONTEXT.md#routing`) resolves on the path portion; the anchor is not validated in v1.

**Findings that fall out of the graph:**

| Category | Meaning |
|---|---|
| `orphan` | In-scope doc unreachable from any root. |
| `broken_ref` | Edge to a path that doesn't exist. |
| `routing_drift` | A root references a path that doesn't exist (a routing file pointing at nothing). |
| `malformed_link` | A link that doesn't parse — distinct from `broken_ref` (which points somewhere real-shaped that's absent). Never becomes an edge. |
| `escapes_root` | A relative path resolving above root, or any absolute filesystem path. Recorded, **never read**. |

### The sub-scores

Five required sub-scores, each `0–100`, `100 = healthy`, same direction and range as the headline so the composite is legible:

- **`bloat`** — three metrics: routing token weight (tokens in files that load every session), inlined content in a router (a routing file whose body is mostly prose/tables past a ratio threshold), and routing chain depth (hops from `CLAUDE.md` to a leaf). Token counting is character-based approximation (`char-approx-v1`); the method is reported in `stats`.
- **`orphans`**, **`broken_refs`**, **`routing_drift`** — derived from the graph above.
- **`coverage`** — the counterweight that stops the rubric being a bloat-minimizer. Code-aware but **directory-level only**: the tool reads the directory tree (existence and paths), never opens a source file. A significant source directory has coverage if it contains a `CONTEXT.md` or is referenced by a routing file (or an ancestor) within N hops. `coverage` floors to zero when no root `CLAUDE.md` exists at all. This measures whether the routing layer *claims* the code, not whether the claim is *accurate* — accuracy is `doc_drift`'s job, and the rendered summary must say so.

### Output contract

The return value is one **structured JSON object**; the human-readable summary is a **markdown string built by the tool from that object** and returned alongside it. The agent's job is to display that string verbatim — the tool description instructs it not to summarize, soften, or reorder. This is the same reasoning as the read-only invariant: an agent-narrated score is fakeable at exactly the step that matters, and a persisted `export_record` must be the same document the user saw.

```
{
  "root": { "path": "<resolved path>", "method": "claude_md | git_root | given_path" },
  "score": 0-100,
  "subscores": { "bloat", "orphans", "broken_refs", "routing_drift", "coverage" },
  "findings": [
    { "id", "category", "severity", "file", "line", "message", "evidence" }
  ],
  "stats": {
    "docs_in_scope", "routing_files", "routing_tokens",
    "orphan_count", "files_skipped", "token_count_method", ...
  },
  "rendered": "<markdown summary built from the above>"
}
```

- **`line`** is nullable — some findings are file- or directory-level.
- **`file` on a non-file finding.** `file` always holds a path relative to the resolved root. Document-anchored findings — `orphan`, `broken_ref`, `routing_drift`, `malformed_link`, `escapes_root`, and the bloat token-weight / inline-ratio warnings — set `file` to the doc they concern; `line` is the link's line for the link-bearing categories (`broken_ref`, `routing_drift`, `malformed_link`, `escapes_root`) and `null` for the whole-file ones (`orphan`, bloat warnings). `escapes_root` is document-anchored despite naming a target outside root: `file` is the in-scope doc holding the escaping link and `line` its line, while the escaped or absolute target lives only in `evidence` and is never opened. The one genuinely directory-level category — the uncovered-significant-workspace coverage finding — sets `file` to the uncovered directory's path (with a trailing `/`) and `line` to `null`. This preserves the `id` rule: the normalized-path component is `file` and the discriminator is the unresolved/escaped target or the uncovered directory path, both drawn from the directory walk — never a measured value, never a source-file read.
- **MCP result shape.** Both halves ride in one `CallToolResult`: the full JSON object above is returned as **`structuredContent`** (the tool declares a matching **`outputSchema`**), and the `rendered` markdown is returned as a **`text` content block** — the always-displayable surface a text-only client shows, which is what satisfies *tool owns rendering; agent displays verbatim*. The `rendered` field is retained inside the structured object as well, so a structure-aware client (and a persisted `export_record`) reproduces the exact document a text-only client displayed. This needs the SDK/spec revision that carries `structuredContent` + `outputSchema` (MCP `2025-06-18`, `@modelcontextprotocol/sdk` ≥ 1.13.0); the build pins that floor in `package.json` in the same commit as the tool. A structured error uses the standard error envelope returned as a `text` block, with no `structuredContent`.
- **`evidence`** carries the raw counted thing (a token count, an unresolved path, the referencing file). This is what makes the score unfakeable once persisted and what an auditor reading an exported record needs.
- **`severity`** — fixed five-level enum, part of the contract (not the rubric): `info` / `low` / `medium` / `high` / `critical`. The scale is stable so historical `export_record` artifacts stay comparable; *which* severity a finding type carries is a rubric matter (below).
- **`id`** — a stable hash of `category + normalized-path + stable-discriminator` (the discriminator is the target: an unresolved link path, an uncovered directory), never a measured value — so an unchanged finding keeps its id across runs while its severity and evidence move, and record diffs read as "still present, worse" rather than delete+add.
- **`stats.files_skipped`** and the `token_count_method` string are mandatory: a persisted record must show whether the audit was partial and how the number was counted, or it isn't auditable.

### Failure & degradation

- **`NO_ROUTING_ROOT`** error only for a genuine failure of the *target*: path doesn't exist, isn't a directory, or isn't readable at all. Absence of docs is a finding, not an error.
- **Degrade, never abort.** A mid-walk failure (unreadable file, non-UTF8/binary named `.md`, empty `CLAUDE.md`, malformed link) is recorded and scored around, never fatal. Unreadable files are excluded from scoring denominators so they can't silently drag the score; an empty `CLAUDE.md` is a **critical**-severity finding — a root that exists but is empty is *worse* than one that is absent, because it looks handled — matching §4's mapping, where both an absent and an empty root are `critical`.
- Errors use the standard structured envelope from `CLAUDE.md`; no infrastructure detail is ever surfaced.

### Determinism & invariants

Stateless, idempotent, cold walk every invocation — same tree in, same score out. Path ordering is normalized (sorted) before findings are emitted so two identical audits produce identical records. The token approximation is stable per version; a changed constant becomes a new method string (`char-approx-v2`).

Invariants, asserted in `src/API.md` as the same class of rule as the free/paid boundary: **read-only · never reads above the resolved root · never follows symlinks · stateless / no cache · tool owns rendering · severity scale is stable contract.**

### Dependencies

Minimal-dep bias. Markdown link extraction is a regex (no AST parser). `.gitignore` semantics use `ignore` (tiny, zero-dependency, standard). Token counting avoids tiktoken-class packages (native bindings / large vocabulary files defeat a "cheap to install" pitch) in favor of the calibrated character approximation.

### Discovery

Three passive surfaces, no first-run interstitial: the **tool description** (the primary, always-present front door — written as an offer, not a definition), the **README** (leads with `context_audit` and a real sample run), and **`/handoff`** naming the tool as the way to check the context budget (rule 2), so anyone running the loop meets it as part of the method.

### Prerequisite

`context_audit` is tool #1 and assumes a running server. The stdio server scaffold (`package.json`, TypeScript config, build step, server entry registering the tool list) is a bounded **`server-bootstrap`** prerequisite — a scaffold step under the approved server design doc, not a separate loop. Its exit criteria appear in Decisions below.

### Deliberately skipped

- **An "evaluation mode"** for repos the user doesn't own — no behavioral difference; it would only cost tool-definition tokens against the ~4k standing budget.
- **Any write, diff, or apply.** The tool names the fix in a finding's `message`; it never edits, proposes a patch, or offers to apply one. Read-only, full stop. Remediation is the upsell path.
- **Docs-vs-code content checks** (parsing migrations, routes, handlers). That is `doc_drift`'s only distinct job. Directory-existence awareness is not content awareness; if `context_audit` ever opens a source file's contents, the boundary broke.
- **Multi-tool context formats** (`.mdc`, `.cursorrules`, `.txt`) — a different context layer with different roots. Out for v1, demand-gated for v2.
- **tiktoken-class exact token counting** — package weight not worth it against an already-approximate "~4k tokens" constraint.
- **Caching / any on-disk state** — a cache is a write; excluded by the read-only invariant.
- **Following symlinks / reading above root** — security surface B&A can't afford on the acquisition hook.
- **A first-run banner, install-time prompt, or self-announcement.**
- **`export_record`** — persistence is Phase 2, the paid boundary, a separate feature. `context_audit` only produces the artifact it would persist.

---

## 4. Decisions

Carried verbatim from the Gate 2 ledger.

### Resolved

- **Target user & mode** — a developer auditing a repo they work in (own or inherited); one behavior, no evaluation mode.
- **Win order** — agent accuracy > token cost > credibility; credibility never appears in the rubric; the rubric penalizes gaps as well as excess.
- **Tool/prompt boundary** — `context_audit` audits the routing layer only and never inspects source content; `doc_drift` owns schema-vs-code; "drift" here means routing drift.
- **Input & root** — optional `path` (default cwd); resolve `CLAUDE.md` → git root → given path; `root` reports the method.
- **Graph** — nodes = in-scope docs, edges = relative markdown links, roots = `CLAUDE.md` (incl. nested) + every `CONTEXT.md`.
- **Escaped paths & root boundary** — a relative path resolving above root, or any absolute filesystem path, is recorded as the `escapes_root` finding category and **never read**; the tool never reads a byte above the resolved root. A hard, security-bearing invariant, not merely a finding category.
- **Scope & exclusions** — markdown-only v1 (`.md` + `AGENTS.md`/`CLAUDE.md` by name); respect `.gitignore`; hard-skip set as listed; skip `.claude/commands/`.
- **Orphan scope** — routed-workspaces-only (docs under directories a routing file references) plus root `CLAUDE.md`; repo furniture (README, CHANGELOG, CONTRIBUTING, LICENSE, SECURITY, CODE_OF_CONDUCT, `.github/`) denylisted from orphan scoring by name.
- **Multi-tool formats** — out for v1; demand-gated for v2.
- **Output** — one JSON contract plus a tool-built `rendered` markdown string (agent displays verbatim); sub-scores required; `evidence` carries the raw counted thing; `line` nullable; `100 = healthy`.
- **Severity enum** — fixed five-level contract (`info`/`low`/`medium`/`high`/`critical`). Mapping: `critical` = root absent or empty; `high` = `broken_ref`, `routing_drift`, or an uncovered significant **source** workspace (`coverage`); `medium` = `orphan`, `escapes_root`, or an uncovered significant **test** workspace (`coverage_test` — a path segment named `test`/`tests`/`__tests__`/`spec`, case-insensitive; heuristic, not a threshold; per `planning/decisions/2026-08-20_test-dir-coverage-severity.md`); `low` = `malformed_link`, depth/inline-ratio warning; `info` = skipped file, symlink-encountered, non-scoring note.
- **Token method** — `char-approx-v1`; the constant is part of the version string (a changed constant → `char-approx-v2`); the method is reported in `stats`.
- **Finding `id`** — hash of `category + normalized-path + stable-discriminator` (target, never a measured value).
- **Bloat metrics** — routing token weight, inlined-content ratio, routing chain depth (metrics fixed; thresholds stubbed).
- **Coverage metric** — significant source directories lacking router coverage, directory-level only, never opening a source file (metric fixed; significance/thresholds stubbed).
- **Invariants** — read-only; never read above root; never follow symlinks; stateless/no-cache; tool owns rendering; stable severity scale; normalized path ordering for determinism.
- **Rendering ownership** — the tool builds the summary; the agent displays it verbatim.
- **Auth & wrapper** — pure tool, keyless, no prompt wrapper.
- **Discovery** — three passive surfaces (tool description, README real sample, `/handoff`); no first-run banner.
- **README sample** — must be a real run against a real repo, not a hand-written ideal.
- **Dependencies** — markdown = no dep (regex); `.gitignore` = `ignore`; token = character approximation (no tiktoken).
- **`server-bootstrap`** — a scaffold step under the approved server design doc, not its own loop. **Exit criteria:** installable server; zero tools; `npx` + a client listing an empty tool-set; `src/API.md` rescoped to the MCP surface; `src/CONTEXT.md` created with the context-budget ledger; `src/TDD.md` tracker migrated (placeholders cleared, `TBD-1…9` created, `TBD-6` recorded resolved = `B-A-MCP`); the `SESSION_HANDOFF.md` claim about `src/CONTEXT.md` corrected.

### Stubbed (all data-blocked, calibrate from the first dogfood run)

`TBD-10/11/12` are **reserved contingent on the `server-bootstrap` tracker migration**, which creates the real `TBD-1…9` rows — today those live only in `CLAUDE.md` and the server design doc, not in `src/TDD.md` (whose highest row is the placeholder `TBD-008`). The three ids are valid only once `1…9` exist; the migration must land before they are treated as committed, and the append happens *after* it.

- **`TBD-10`** — sub-score → headline **weighting** function (accuracy cluster weighted above bloat; an N/A sub-score drops and reweights). Principle resolved; the numbers need real data.
- **`TBD-11`** — **bloat thresholds** (routing-token-weight, inline-ratio, chain-depth cutoffs → severity).
- **`TBD-12`** — **coverage significance + thresholds** (source-vs-config classification, minimum file count for "significant", ancestor-coverage-within-N-hops vs. own-router).

### Sequencing consequence

All three stubs block the headline number, and the README requires a real run. Therefore the **first dogfood run against `B-A-MCP` is a calibration run, not the README run**: calibrate `TBD-10/11/12` from it, then re-run — that second output is the README sample. An uncalibrated score is never published as the pitch.

---

## 5. Docs affected

Named only — changes belong to the build phase, not this doc.

- **`src/API.md`** — gains the `context_audit` MCP surface: input parameter, output JSON schema, error surface, and the asserted invariants. Lands in the same commit as the tool (rule 8). Presupposes the `server-bootstrap` rescope off the raw template.
- **`src/CONTEXT.md`** — the context-budget ledger records `context_audit`'s measured standing tool-definition cost against the ~4k budget (rule 2). Created during `server-bootstrap`.
- **`src/TDD.md`** — today holds only template placeholders (`TBD-001…008`). `server-bootstrap` migrates it: clear placeholders, create `TBD-1…9`, record `TBD-6` resolved = `B-A-MCP`, then append `TBD-10/11/12`. The three stubs are appended **after** the migration, never before.
- **`README`** — new: install instructions, the free/paid boundary, and a sample-output section filled from the calibration re-run.
- **`prompts/handoff.md`** — names `context_audit` as the way to verify the context budget; the edit lands in the release commit alongside `.claude/commands/` regeneration (rule 1), never mid-task.
- **`planning/decisions/`** — one or more dated records capturing the *why* behind the decisions resolved in Gate 2 (the tracker holds status; these hold reasoning).
- **`SESSION_HANDOFF.md`** — updated at `/handoff`; corrects the verified-truth drift that claims `src/CONTEXT.md` exists and is populated.
- **`package.json`** (owned by `server-bootstrap`) — adds the single runtime dependency `ignore` (MIT). The published package distributes it, so the addition carries obligations (below).
- **`THIRD_PARTY_NOTICES.md`** — a new notice block for `ignore` (name, author, MIT license text, upstream URL, pinned version, unmodified statement), landing in the **same commit** as the dependency addition (rule 4). This adds a fifth component to a root, release-blocking file that is currently a stub blocked on TBD-2.
- **`planning/Integration_Spec.md` §2** — a new pinned-version row for `ignore`, same-commit, matching `package.json` and the notice block.

---

*Review checkpoint: this is the last cheap correction point before the design becomes code.*
