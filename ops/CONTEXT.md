# Operations

Deploy, monitoring, runbooks. Read before any deploy or infra change.

## Infrastructure

The free tier is a **local stdio MCP server** published to npm as `b-a-mcp`.
**Nothing deploys to a server** — each user runs it locally on their own machine.
There is no hosted surface, no database, no CI/CD deploy pipeline.

The one paid call, `export_record` (Phase 2, not built), is a client that reaches
a DigitalOcean Function living in the **site repo**, not here. See
`planning/Integration_Spec.md` for that cross-repo contract.

## Deploy Process

"Deploy" = **publish the npm package on a semver tag**. That is the whole
release. Steps below are verified against `package.json` (`files` whitelist,
`bin`, build/test scripts) as of 2026-08-27.

### Publish runbook (free tier → npm)

Run from a **clean `main`** after the release branch has merged.

1. **Confirm trunk state.**
   ```
   git checkout main && git pull
   git status            # must be clean
   git rev-parse --short HEAD
   ```
2. **Build + full suite (must be green before anything else).**
   ```
   npm ci                # fresh, lockfile-exact install
   npm run build         # tsc → dist/
   npm test              # expect all tests pass (193 at 2026-08-27)
   ```
3. **Dry-run the pack from a fresh checkout** (proves the *committed* tree
   publishes, not local dirty state). Clone HEAD to a temp dir, then:
   ```
   npm ci && npm run build && npm test
   npm publish --dry-run
   ```
   Confirm the tarball contains `LICENSE`, `THIRD_PARTY_NOTICES.md`, `README.md`,
   `prompts/**`, and `dist/src/**` — and **not** the bundled skills (they are the
   paid bundle, never shipped in the free npm package) or `dist/test/**`.
4. **Version bump = the release gesture.** `npm version` writes `package.json`
   and creates the git tag in one step; pick the semver level:
   ```
   npm version patch      # or minor / major
   ```
5. **Publish.**
   ```
   npm publish            # default access = public; tag = latest
   ```
   Requires being logged in to `registry.npmjs.org` (`npm whoami` to check).
6. **Push the commit + tag.**
   ```
   git push && git push --tags
   ```
7. **Verify the published package resolves.**
   ```
   npx b-a-mcp@<version>  # or npm view b-a-mcp version
   ```

### Pre-publish gates (rule-driven — do not skip)

- **THIRD_PARTY_NOTICES.md finalized** — every bundled component + runtime dep
  block filled from its own `LICENSE`/`NOTICE` at the pinned commit (rule 4). No
  STUB banner. (Done 2026-08-27, TBD-2/TBD-4 —
  `planning/decisions/2026-08-27_tbd-2-4-resolved.md`.)
- **Context-budget ledger < ~4000 tokens** (rule 2), asserted by
  `test/override-log/ledger.test.ts`.
- **`src/API.md` matches the shipped MCP surface** (rule 8).

## Runbooks

- **Publish (free tier → npm):** see *Deploy Process → Publish runbook* above.

## Additional Runbooks (to be added)

- **Paid tier (`export_record`) release** — Phase 2. Blocked on the site repo's
  consent-gated checkout + key issuance (see `planning/Integration_Spec.md`,
  `planning/Roadmap.md` Phase 2). Add when that work starts.
- **Yank / deprecate a bad release** (`npm deprecate` / `npm unpublish` within
  the 72h window) — add when first needed.

## Rules

- Free tier publishes to npm **on a semver tag**. Nothing deploys to a server.
- Never publish with a stubbed `THIRD_PARTY_NOTICES.md` (rule 4) or a ledger over
  budget (rule 2).
- The bundled skills are the **paid** bundle — they are not in the npm `files`
  whitelist and must never be shipped in the free package.
