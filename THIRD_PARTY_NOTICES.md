# Third-Party Notices

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

Licenses and copyright lines below were read from each component's own
`LICENSE`/`NOTICE`/`README` at the pinned commit (TBD-2, resolved
2026-08-27 — see `planning/decisions/2026-08-27_tbd-2-4-resolved.md`), not from
third-party listings.

---

## Bundled components (paid-tier skill bundle)

## Superpowers

- **Author:** Jesse Vincent (obra)
- **License:** MIT
- **Upstream:** https://github.com/obra/superpowers
- **Pinned version:** `v6.3.0` (commit `b36e082`)
- **Modified:** No (bundled as-is)
- **License text:**
```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## caveman

**Scope — read before relying on this block.** The caveman repository is
**split-licensed**. Only the prose skill at **`skills/caveman/`** (files
`SKILL.md` + `README.md`) is bundled, and it is **MIT**. Per the repository's
`LICENSING.md`, the entire `skills/` tree is MIT and "untouched"; the
Engine-linked directories (`engine/`, `proxy/`, `cacheengine/`, `rewriter/`,
`browse/`, `mcp/`, `shrink/`, `mem/` Go core, `shared/platform/`) are **Business
Source License 1.1** and are **not** bundled. This notice covers `skills/caveman/`
only and does **not** state or imply that the whole repository is MIT.

- **Author:** Julius Brussee
- **License:** MIT (scoped to `skills/caveman/`)
- **Upstream:** https://github.com/JuliusBrussee/caveman
- **Bundled path:** `skills/caveman/`
- **Pinned version:** commit `a42ef76` (the `package.json` version string `2.2.0`
  and the git tag on this commit `pi-v0.1.0` disagree; the commit is the
  authoritative pin — widening the bundle beyond `skills/caveman/` requires a
  fresh path audit against `LICENSING.md`, not a blanket `skills/*` pin)
- **Modified:** No (bundled as-is)
- **License text** (the repository root `LICENSE`, including its scope note):
```
Scope note: this MIT license covers this repository except Engine-linked
directories listed in LICENSING.md (engine/, proxy/, cacheengine/, rewriter/,
browse/, mcp/, shrink/, cavemem Go core, shared/platform/), which are licensed
under Business Source License 1.1 — see LICENSE.BSL. New Engine-linked runtime
modules default to BSL-1.1 unless explicitly classified as MIT.

MIT License

Copyright (c) 2026 Julius Brussee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## claude-mem

- **Author:** Alex Newman
- **License:** Apache-2.0
- **Upstream:** https://github.com/thedotmack/claude-mem
- **Pinned version:** `v13.15.3` (commit `e2d1df5`)
- **Modified:** No (bundled as-is)
- **NOTICE file** (reproduced verbatim from the source repository — TBD-1,
  resolved 2026-08-27; the repository ships a `NOTICE`, so Apache-2.0 §4(d)
  requires it be carried here):
```
Claude-Mem
Copyright 2026 Alex Newman

This product includes software developed for the Claude-Mem project.

Licensed under the Apache License, Version 2.0.

If other attributions are required by dependencies or included code, add them here.
```
- **License text:** Apache License, Version 2.0 — the full text is available at
  https://www.apache.org/licenses/LICENSE-2.0 and is reproduced in the bundle
  alongside the component. All copyright, patent, trademark, and attribution
  notices from the source are retained; the `NOTICE` file above is carried
  unmodified per §4(d).

---

## task-observer

- **Author / creator:** Eoghan Henn (rebelytics.com)
- **Title:** task-observer (from *one-skill-to-rule-them-all*)
- **License:** CC-BY-4.0
- **License link:** https://creativecommons.org/licenses/by/4.0/
- **Upstream (material link):** https://github.com/rebelytics/one-skill-to-rule-them-all
- **Pinned version:** `v2.0.0` (commit `281f134`)
- **Modified:** No (bundled as-is)
- **Copyright / disclaimer notice:** The `LICENSE.txt` in the source is the bare
  CC-BY-4.0 legalcode with no embedded copyright holder; the required
  attribution string is supplied by the project README: *"Created by Eoghan
  Henn / rebelytics.com"*, with credit given by linking the original repository
  (https://github.com/rebelytics/one-skill-to-rule-them-all/) and naming the
  author.

CC-BY-4.0 attribution requires: creator name, title, copyright notice (if
supplied), disclaimer notice (if supplied), a link to the license, a link to the
material, and an indication of whether it was modified — all present above. Per
CLAUDE.md rule 5, no technological measures are applied to the delivered
`task-observer` files after delivery (no DRM on the CC-BY component).

---

## icm-architect

- **Author:** Jake Van Clief (published under the RinDig GitHub organization)
- **License:** MIT
- **Upstream:** https://github.com/RinDig/icm-architect
- **Pinned version:** commit `b20fb45` (no tags on the repository)
- **Modified:** No (bundled as-is)
- **Reproduction note:** B&A documentation reproduces expression from the
  bundled `icm-architect` files (Jake Van Clief, MIT). This attribution — the
  copyright line and license text below, retained in the bundle — satisfies the
  MIT condition for that reproduction (TBD-4, resolved 2026-08-27). The ICM
  *methodology* itself (Van Clief & McDermott, 2026) is a separate work;
  B&A does not claim the methodology as B&A-original.
- **License text:**
```
MIT License

Copyright (c) 2026 Jake Van Clief

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Runtime dependencies (npm)

Packages the published `b-a-mcp` package declares in `package.json` and
redistributes on install. Tracked here separately from the bundled skills
above; pinned versions must match `package.json` and `Integration_Spec.md`.

### @modelcontextprotocol/sdk

- **Author:** Anthropic (Model Context Protocol project)
- **License:** MIT
- **Upstream:** https://github.com/modelcontextprotocol/typescript-sdk
- **Pinned version:** `^1.30.0` (see `package.json`; resolved lockfile pins the exact version; true minimum is `1.13.0`, which introduced `structuredContent`/`outputSchema` for spec rev `2025-06-18`)
- **Role:** the only runtime dependency at bootstrap — provides the MCP `Server` and `StdioServerTransport`.
- **Modified:** No (consumed as published).
- **License text:**
```
MIT License

Copyright (c) 2024 Anthropic, PBC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ignore

- **Author:** Kael Zhang (`kael`) and contributors
- **License:** MIT
- **Upstream:** https://github.com/kaelzhang/node-ignore
- **Pinned version:** `^7.0.6` (see `package.json`; resolved lockfile pins the exact version)
- **Role:** applies `.gitignore` semantics during the `context_audit` walk.
- **Modified:** No (consumed as published).
- **License text:**
```
Copyright (c) 2013 Kael Zhang <i@kael.me>, contributors
http://kael.me/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## Excluded

`impeccable` is intentionally not bundled (no UI in this repo).
