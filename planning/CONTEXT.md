# planning/ — CONTEXT

Routing for the planning workspace. Read this before loading any doc here, so you pull only what the task needs.

This workspace holds the WHAT and WHY — stable across commits. It does not hold code, and it does not hold the schema-of-record docs (those bind to code and live in `src/`).

| Doc                     | Load when                                                                                  |
|-------------------------|--------------------------------------------------------------------------------------------|
| `designs/`              | Before building any feature. Each design doc is the approved WHAT & WHY for one feature. The current one is `designs/2026-08-18_ba-mcp-server-design.md`. |
| `Integration_Spec.md`   | Before touching `export_record` or any bundled third-party component. Holds the cross-repo `export_record` contract and the pinned component versions. |
| `Roadmap.md`            | Before starting a new phase or picking what to build next. Phases and dependency order.    |
| `decisions/`            | When you need the *why* behind a resolved TBD. One file per decision, `YYYY-MM-DD_title.md`. |

**Not in this workspace** (cut from the template, do not recreate here):
- `RBAC_Specification.md` — no roles in this product.
- `Data_Dictionary.md` — lives in the site repo; email is captured there at key issuance, not here.
- `Requirements.md` — deferred; the design doc covers current scope. Add only if scope grows past what one design doc can hold.

TBD status lives in `src/TDD.md`, not here. This workspace records decisions once made; the tracker records their open/resolved state.
