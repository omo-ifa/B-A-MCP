# Design Doc — B&A Build Loop MCP Server

**Date:** 2026-08-18
**Status:** Approved for build planning
**Author:** B&A Solutions

---

## Motivation

B&A's four-stage build loop (`/intake` → `/decisions` → `/design-doc` → `/handoff`) is proven internal methodology with no external distribution. Two goals, one artifact:

1. **Authority.** A free, installable MCP server puts the B&A method inside other developers' tooling. The methodology's differentiator — a Gate 0 that can end an engagement, and guidance-with-override instead of hard stops — is a position no competing framework holds.
2. **Lead generation.** Every gate terminates in a documented artifact. Persisting that artifact is the paid call, and the point at which identity is captured.

Developers are not the consulting buyer. They are the distribution channel to the consulting buyer.

---

## Approach

### The free/paid boundary

**Free = the reasoning. Paid = the record.**

One boundary, at one call. Not a free and paid variant of every capability. A user runs every gate and every audit at no cost and receives full output in-session. When they want that output as a versioned, timestamped, persisted artifact, that call requires a key.

This is defensible because an audit trail's value *is* persistence — the free version cannot accidentally substitute for the paid one.

### Transport: local stdio, not remote

The free tool surface runs as a local stdio MCP server (npm, `npx`-installed). It executes on the user's machine and makes no request to B&A infrastructure.

Consequences:
- Free tier costs approximately nothing to operate.
- No signup wall at install — matching the ecosystem norm, where the dominant free-tier pattern is keyless and the key appears at the value moment, not the front door.
- No usage telemetry on the free tier. Accepted tradeoff. Export events are the measurable signal.

Only `export_record` calls a hosted endpoint.

### Context budget

MCP prompts load on invocation and carry near-zero standing context cost. MCP tools carry roughly 500–1,000 tokens each, permanently, for every user who keeps the server installed.

Therefore: **the five gates ship as prompts, not tools.** Phase 1 ships four tool definitions total. Standing cost stays under ~4k tokens — low enough that users do not prune the server during context cleanup. This constraint governs all future additions.

### Surface

**Prompts (free, unauthenticated)**

| Prompt | Job |
|---|---|
| `/problem-fit` | Gate 0. Four of the AI Readiness Scorecard's 24 questions. Can terminate the engagement. |
| `/intake` | Gate 1. Repo-grounded questioning until questions dry up. |
| `/decisions` | Gate 2. Every decision RESOLVED or STUBBED as a tracked TBD. |
| `/design-doc` | Gate 3. One design doc, fixed shape, WHAT & WHY only. |
| `/handoff` | Session close. Verify docs match code, log resolved TBDs, write continuity. |

`/problem-fit` sits *before* `/intake`. A framework whose first gate can tell you to stop is the brand thesis expressed as architecture.

**Tools (free, unauthenticated — three)**

| Tool | Role |
|---|---|
| `context_audit` | Acquisition hook. Reads the real `CLAUDE.md` / `CONTEXT.md` tree; scores routing bloat, orphan docs, drift. Cannot be faked — it reads actual files. |
| `doc_drift` | Retention hook. Checks `ERD.md` / `API.md` against actual schema and handlers. Weekly re-run behaviour. |
| `override_log` | Differentiation hook. Generates the risk statement and override prompt from the guidance-with-override gate model. |

**Tool (paid — one)**

| Tool | Role |
|---|---|
| `export_record` | Persists any gate or audit output as a versioned, timestamped artifact. Requires a key. |

**Explicitly out of Phase 1:** `build_buy_wait`, `vendor_vet`, `scope_to_estimate`. These are operator-facing decisions in developer clothing and belong to a later operator-facing server, not this one.

### Infrastructure

Self-hosted on existing B&A infrastructure, reusing the consent-gated checkout pattern already built for the digital catalog: authenticated call → write metadata → return artifact.

- `export_record` endpoint: DigitalOcean Function. Free allowance is 90,000 GiB-seconds/month per team; overage $0.0000185 per GiB-second; 100ms minimum runtime; no per-invocation charge. At 256 MiB and ~500ms, one call costs 0.125 GiB-seconds — roughly 700,000 free calls per month. The free allowance will not be exhausted.
- Key validation: query Stripe customer metadata. No separate datastore in Phase 1.
- Recurring infrastructure cost: approximately $0/month, plus Stripe fees on sales.

Marketplace listing was declined: a 30% cut against ~$0 hosting, and email captured at key issuance lands in B&A's funnel rather than a third party's. Tradeoff accepted: B&A carries its own security review, discovery, and support.

### Repository split

**Two repos, not one.** The server package lives in a new public repository. The `export_record` function stays in the existing site repository.

The free tier must be publicly readable — it is an npm package developers install and inspect, and its credibility depends on being auditable. The site repo contains unlisted delivery page paths, Stripe wiring, `.xlsx` product files, and nine legal documents; it can never be made public, and a subdirectory cannot be open-sourced independently.

Three further reasons: the two artifacts have different deploy triggers (App Platform on push vs. npm on semver tag); they require different `LICENSE` files, and a repo holds one; and a repo containing both a marketing site and an MCP server has no coherent Layer 0 `CLAUDE.md`.

| Repo | Contents |
|---|---|
| **New, public** | Five prompts, three free tools, `export_record` client, bundled third-party components, `LICENSE`, `THIRD_PARTY_NOTICES.md` |
| **Existing site repo, private** | `export_record` function, key issuance, EULA, sales-page disclosure |

`export_record` is not part of the published package. The package ships only the client that calls it.

**Cost of the split:** two `SESSION_HANDOFF.md` files, and a cross-repo contract — the `export_record` request/response shape — that lives in one repo and is depended on by the other. That contract is recorded in the server repo's `Integration_Spec.md` to keep it from drifting silently.

### Documentation structure

`REPO_STRUCTURE.md` v2 applies, with deviations. It was written for a full-stack product app with a database, roles, and PII; this server has none. Applying it unmodified would violate its own rule that a doc nobody reads or edits is dead weight, not safety.

| Doc | Disposition |
|---|---|
| `RBAC_Specification.md` | Cut — no users, no roles |
| `Data_Dictionary.md` | Cut here. Key issuance handles email; that entry belongs in the **site repo's** Data Dictionary, where it does not yet exist |
| `src/ERD.md` | Cut — no database |
| `src/API.md` | Keep, rescoped: the MCP surface — prompt definitions and tool JSON schemas. Same-commit rule intact. The tool schemas are the public contract |
| `Integration_Spec.md` | Keep, promoted: cross-repo `export_record` contract plus four bundled components with pinned versions |
| `Requirements.md` | Deferred — the design doc covers it at this scope |
| `ops/` | Reduced to a release runbook. Nothing deploys; `npm publish` on a semver tag |
| `TDD.md`, `planning/decisions/`, `Roadmap.md`, all `CONTEXT.md` files | Unchanged |

**New — `prompts/` directory.** The five prompts are shipped content, not code. They do not belong under `src/`.

**New — context budget section in `src/CONTEXT.md`.** The governing constraint is that standing tool-definition cost stays under ~4k tokens. Per-tool measured token counts are recorded there and verified at `/handoff`. Without a tracked number this drifts silently until users prune the server.

**New — legal artifacts are release-blocking build artifacts.** `LICENSE` and `THIRD_PARTY_NOTICES.md` sit at root with their own same-commit rule: bumping a bundled component's pinned version requires updating the notices file in the same commit.

### The self-reference problem

The gate commands are simultaneously B&A's development workflow and B&A's product. `.claude/commands/intake.md` is a working tool for building this repo; the shipped `/intake` prompt is the thing being sold. Same content, two locations — guaranteed to drift, and the failure is silent and reaches customers.

**Resolution: `prompts/` is the single source of truth. `.claude/commands/` is generated from it at build.**

This also means B&A dogfoods the exact artifact customers install — every bug hit while building is a bug a customer would have hit.

**Constraint:** regeneration happens at `/handoff`, not continuously. Mid-edit regeneration means the workflow runs against an unstable version of itself.

### Packaging and third-party components

The paid bundle ships third-party skills alongside B&A's original work, with prominent disclosure that each is separately available for free. Convenience is the value proposition; concealment is not.

| Component | License | Obligation |
|---|---|---|
| Superpowers (obra / Jesse Vincent) | MIT | Copyright notice + license text |
| caveman | MIT | Copyright notice + license text |
| claude-mem | Apache 2.0 | License text; retain copyright/patent/trademark/attribution notices; reproduce `NOTICE` contents if present; state modified files |
| task-observer | CC-BY-4.0 | Creator, title, copyright notice, disclaimer, license link, material link, modification indication |

**`impeccable` is excluded from the bundle.**

**CC-BY-4.0 constraint:** §2(a)(5)(B) prohibits imposing additional terms or technological measures that restrict a recipient's exercise of licensed rights. Charging money is permitted; a blanket no-redistribution EULA clause is not, as applied to that component. The EULA requires a carve-out: B&A's original work governed by the B&A license; listed third-party components remain under their own licenses, which govern in case of conflict.

Gating the download behind payment is permitted. Gating delivered files with DRM is not.

---

## Decisions carried over

| # | Decision | Resolution |
|---|---|---|
| 1 | Primary audience | Both, sequenced — developers first |
| 2 | Free-tier access mechanic | Keyless; key required at the artifact boundary |
| 3 | Business model | Free skills, paid tier on the same server |
| 4 | Third-party packaging | Bundle and resell, with prominent free-download disclosure |
| 5 | Phase 1 tool count | Three free tools + `export_record` |
| 6 | Key and record hosting | B&A infrastructure, not a marketplace |
| 7 | Gates as prompts vs. tools | Prompts — context budget is the governing constraint |
| 8 | Repository layout | New public repo for the server; `export_record` stays in the site repo |
| 9 | Gate command source of truth | `prompts/` is source; `.claude/commands/` generated at build |
| 10 | `REPO_STRUCTURE.md` v2 application | Applied with deviations — RBAC, Data Dictionary, ERD cut; API rescoped to MCP surface |

---

## What will change

### New public repo

**Package**
- MCP server (stdio), published to npm
- `prompts/` — five prompt definitions, source of truth
- Three free tool definitions + `export_record` client
- Build step generating `.claude/commands/` from `prompts/`
- Bundled third-party components with pinned versions

**Docs**
- `CLAUDE.md`, `WORKFLOW.md` (with Gate 0 inserted), `SESSION_HANDOFF.md`
- `planning/CONTEXT.md`, `planning/Roadmap.md`, `planning/designs/` (this doc), `planning/decisions/`
- `planning/Integration_Spec.md` — cross-repo `export_record` contract; bundled component versions
- `src/CONTEXT.md` — conventions plus the measured context-budget section
- `src/API.md` — MCP surface: prompt definitions and tool JSON schemas
- `src/TDD.md` — Master TBD Tracker
- `ops/` — release runbook only

**Legal (root, release-blocking)**
- `LICENSE`
- `THIRD_PARTY_NOTICES.md` — per component: name, author, license, full license text, upstream URL, pinned version, modified/unmodified statement

### Existing site repo

**New**
- `export_record` DigitalOcean Function, alongside the consent-gated checkout function
- Key issuance flow, reusing the checkout pattern
- Key validation against Stripe customer metadata
- Sales-page disclosure naming each bundled component with a link to its free source, above the buy button

**Modified**
- Product License — third-party carve-out clause (counsel review required)
- `Data_Dictionary.md` — email captured at key issuance; currently absent

### Unchanged

- Existing gate command logic
- Existing Stripe account and checkout architecture
- The six-product Notion catalog
- Site deploy pipeline

---

## Sequencing

`export_record` reuses the consent-gated checkout infrastructure. That infrastructure is not yet proven. **The paid tier cannot launch ahead of it.**

Legal artifacts (notices file, EULA carve-out, sales-page disclosure) must exist before the first sale, not after. Counsel review is external turnaround and should start early, in parallel.

The free tier has no dependency on either and could ship first. Not currently decided — see TBD-8.

**Estimate risk:** `doc_drift` is the least bounded component. Checking `ERD.md` against a real schema means parsing migrations; checking `API.md` against handlers means parsing routes across arbitrary frameworks. If it resists, cut it to Phase 2 and ship two free tools — the acquisition and differentiation hooks survive; only the retention hook defers.

---

## Open TBDs

| ID | Item | Blocks |
|---|---|---|
| TBD-6 | Package and repo name | **Everything — nothing can be scaffolded unnamed** |
| TBD-1 | Does claude-mem's upstream repo ship a `NOTICE` file? | Apache 2.0 compliance |
| TBD-2 | Confirm licenses from each package's actual `LICENSE` / `plugin.json`, not third-party listings | All packaging |
| TBD-4 | Do B&A docs reproduce ICM (Van Clief & McDermott, 2026) expression, or paraphrase it? | Publication |
| TBD-5 | Paid tier price and structure (one-time vs. subscription) | Checkout build |
| TBD-7 | Pinned Superpowers major version | Dependency stability |
| TBD-8 | Split launch (free tier first) or single launch? | Sequencing |
| TBD-9 | `doc_drift` scope — which frameworks and migration formats are in scope for v1? | `doc_drift` build |
| TBD-3 | Verify DO Functions free allowance against the live console (third-party trackers report 25,000 GiB-s; DO docs report 90,000) | Cost model only — not load-bearing |

---

## Non-goals

- Remote/hosted MCP server for non-technical operators — Phase 2, and it carries real cost (App Platform dynamic apps start at $5/month) unlike this one
- Free-tier usage telemetry
- Operator-facing decision tools in this server
- Any marketplace listing
- Monorepo containing both the site and the server
