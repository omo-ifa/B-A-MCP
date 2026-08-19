# Third-Party Notices

*** STUB — NOT FINAL. Release-blocking. ***
Blocked on TBD-2 (read each component's own LICENSE/plugin.json) and TBD-1
(claude-mem NOTICE file). Do not ship a release until every block below is
filled from the actual upstream repo — not from third-party listings.

This file tracks **two distinct classes** of third-party code, which carry
different obligations and must not be conflated:

1. **Bundled components** — third-party *skills* shipped together in the paid
   bundle as a convenience. Each is available separately for free, disclosed as
   such on the sales page, and remains under its own license. These are a
   product-packaging decision, not a code dependency.
2. **Runtime dependencies** — npm packages the *published server* requires to
   run and therefore redistributes via `node_modules` on install (e.g.
   `@modelcontextprotocol/sdk`). These are not part of the "bundle" the sales
   page describes; they are ordinary software dependencies and belong in their
   own section, never as a sixth row in the bundle table.

Same-commit rule (WORKFLOW.md rule 4) applies to **both** classes: any change to
a bundled component or a runtime dependency (version bump, add, remove) updates
its block here in the same commit.

---

## Bundled components (paid-tier skill bundle)

## Superpowers

- **Author:** Jesse Vincent (obra)
- **License:** MIT
- **Upstream:** `TODO: TBD-2 — confirm URL from repo`
- **Pinned version:** `TODO: TBD-7`
- **Modified:** No (bundled as-is) — `confirm`
- **License text:**
```
TODO: TBD-2 — paste full MIT license text with copyright line from the repo.
```

---

## caveman

- **Author:** `TODO: TBD-2 — confirm from repo`
- **License:** MIT
- **Upstream:** `TODO: TBD-2`
- **Pinned version:** `TODO: TBD-2`
- **Modified:** `confirm`
- **License text:**
```
TODO: TBD-2 — paste full MIT license text with copyright line.
```

---

## claude-mem

- **Author:** `TODO: TBD-2 — confirm from repo`
- **License:** Apache-2.0
- **Upstream:** `TODO: TBD-2`
- **Pinned version:** `TODO: TBD-2`
- **Modified:** `confirm — if any files changed, state which (Apache 2.0 §4b)`
- **NOTICE file:** `TODO: TBD-1 — if the repo ships a NOTICE file, reproduce its contents verbatim here`
- **License text:**
```
TODO: TBD-2 — paste full Apache-2.0 license text. Retain all copyright,
patent, trademark, and attribution notices from the source.
```

---

## task-observer

- **Author / creator:** `TODO: TBD-2 — confirm from repo (required for CC-BY attribution)`
- **Title:** task-observer
- **License:** CC-BY-4.0
- **License link:** https://creativecommons.org/licenses/by/4.0/
- **Upstream (material link):** `TODO: TBD-2`
- **Pinned version:** `TODO: TBD-2`
- **Modified:** `confirm — CC-BY requires indicating whether changes were made`
- **Copyright / disclaimer notice:** `TODO: TBD-2 — reproduce if the source supplies one`

CC-BY-4.0 attribution requires: creator name, title, copyright notice (if
supplied), disclaimer notice (if supplied), a link to the license, a link to the
material, and an indication of whether it was modified. All must be present above
before release.

---

## icm-architect

- **Author:** RinDig
- **License:** MIT
- **Upstream:** `TODO: TBD-2 — confirm URL from repo`
- **Pinned version:** `TODO: TBD-2`
- **Modified:** No (bundled as-is) — `confirm`
- **License text:**
```
TODO: TBD-2 — paste full MIT license text with copyright line from the repo.
```

---

## Runtime dependencies (npm)

Packages the published `b-a-mcp` package declares in `package.json` and
redistributes on install. Tracked here separately from the bundled skills
above; pinned versions must match `package.json` and `Integration_Spec.md`.

### @modelcontextprotocol/sdk

- **Author:** Anthropic (Model Context Protocol project)
- **License:** MIT
- **Upstream:** `TODO: TBD-2 — confirm URL from the installed package's repository field`
- **Pinned version:** `^1.0.0` (see `package.json`; resolved lockfile pins the exact version)
- **Role:** the only runtime dependency at bootstrap — provides the MCP `Server` and `StdioServerTransport`.
- **Modified:** No (consumed as published).
- **License text:**
```
TODO: TBD-2 — paste full MIT license text with copyright line from the package's LICENSE.
```

> **Forthcoming:** `ignore` (MIT) is added as a second runtime dependency when
> `context_audit` lands — its block goes here (not in the bundle table), in the
> same commit as the `package.json` addition and the `Integration_Spec.md` row
> (rule 4).

---

## Excluded

`impeccable` is intentionally not bundled (no UI in this repo).
