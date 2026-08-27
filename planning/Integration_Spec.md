# Integration Spec

Third-party and cross-repo integration points. Read before touching `export_record` or any bundled component.

Two things live here because they cross a boundary this repo doesn't control: the `export_record` contract (depended on by the site repo) and the pinned versions of bundled components (owned by upstream repos).

---

## 1. `export_record` — cross-repo contract

**Status: STUBBED — Phase 2.** Not built. The shape below is the intended contract; finalize it when the site repo's endpoint is built, and keep both repos pointed at this section as the single source of truth.

- **Caller:** `src/client/` in this repo (the only authenticated call in the product).
- **Endpoint:** a DigitalOcean Function in the **site repo** (`bobbalexandersolutions.com`), reusing the consent-gated checkout pattern.
- **Auth:** key issued at checkout, validated against Stripe customer metadata. Key never stored in this repo.

**Request (intended):**
```
POST <endpoint>
Authorization: Bearer <key>
{
  "artifact_type": "problem-fit | intake | decisions | design-doc | handoff | context-audit | doc-drift | override-log",
  "payload": { ... the in-session output to persist ... },
  "client_version": "<npm package version>"
}
```

**Response (intended):**
```
{ "record_id": "...", "version": "...", "created_at": "<iso8601>", "url": "..." }
```

**Error surface:** structured error content per `CLAUDE.md` error format. Never reveal infrastructure detail to the client.

**Price/structure (TBD-5, resolved 2026-08-27): $9/month subscription.** Because it is a subscription, `export_record` validation must check **active entitlement** — the caller's subscription must be **currently active** in Stripe at call time, not merely that a key is well-formed or was once issued. A lapsed subscriber is declined like a non-keyholder. Key issued at checkout; validated against Stripe customer metadata (site repo). See `planning/decisions/2026-08-27_tbd-5-8-pricing-and-launch.md`.

---

## 2. Bundled third-party components

The third-party **skills** shipped in the paid bundle alongside B&A's original work, with prominent disclosure that each is separately available free. These are a product-packaging decision, **not npm dependencies** — they are not declared in `package.json` and not shipped in the published package's `files` whitelist. Pinned versions here must match the notice blocks in `THIRD_PARTY_NOTICES.md` (same-commit rule 4). Runtime npm dependencies are a separate class — see §3.

| Component    | License      | Pinned version        | Notes                                                        |
|--------------|--------------|-----------------------|-------------------------------------------------------------|
| Superpowers  | MIT          | `v6.3.0` (commit `b36e082`) | Jesse Vincent (obra). License read from repo `LICENSE`.     |
| caveman      | MIT (scoped to `skills/caveman/`) | commit `a42ef76` | Julius Brussee. Split-licensed repo; only `skills/caveman/` is bundled (MIT per `LICENSING.md`); engine dirs are BSL-1.1 and excluded. Pin is the commit — `package.json` `2.2.0` ≠ tag `pi-v0.1.0`. |
| claude-mem   | Apache 2.0   | `v13.15.3` (commit `e2d1df5`) | Alex Newman. Repo ships a `NOTICE` (TBD-1) — reproduced in the notices file. |
| task-observer| CC-BY-4.0    | `v2.0.0` (commit `281f134`) | Eoghan Henn / rebelytics.com (holder from README; `LICENSE.txt` is bare CC legalcode). CC-BY carve-out required in EULA; no DRM on delivered files. |
| icm-architect| MIT          | commit `b20fb45` (no tags) | Jake Van Clief (RinDig org). Workspace scaffolder (Decision 11). B&A tools govern the structure it generates; they never generate. |

**Excluded:** `impeccable` — not in the bundle (no UI in this repo).

**CC-BY-4.0 constraint (task-observer):** the EULA may not impose terms or technological measures that restrict a recipient's exercise of licensed rights. Charging is fine; a blanket no-redistribution clause is not, as applied to that component. Carve-out: B&A's original work under the B&A license; listed components under their own licenses, which govern on conflict.

---

## 3. Runtime dependencies (npm)

Packages declared in `package.json` and redistributed by the published `b-a-mcp` package on install. A different obligation class from the bundle in §2; full license blocks live in `THIRD_PARTY_NOTICES.md` → "Runtime dependencies (npm)".

| Dependency | License | Pinned version | Notes |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | MIT | `^1.30.0` (`package.json`; exact pin in the lockfile; true minimum `1.13.0` for `structuredContent`/`outputSchema`) | Only runtime dependency at bootstrap. Provides the MCP `Server` and stdio transport. |
| `ignore` | MIT | `^7.0.6` (`package.json`; exact pin in lockfile) | `.gitignore` semantics for the `context_audit` walk. |

---

## Verification checklist (completed at TBD-2 resolution, 2026-08-27)

- [x] Read `LICENSE` / `plugin.json` in each of the five repos; confirm the license matches the table. (All five re-read from their own files at the pinned commits; see `planning/decisions/2026-08-27_tbd-2-4-resolved.md`.)
- [x] Record exact pinned versions. (Commits pinned per the §2 table.)
- [x] Confirm claude-mem NOTICE file existence (TBD-1); reproduce if present. (NOTICE exists — reproduced verbatim in `THIRD_PARTY_NOTICES.md`.)
- [x] Mirror every row into `THIRD_PARTY_NOTICES.md`. (Same-commit, rule 4.)
- [x] Confirm `package.json` versions match this table. (superpowers 6.3.0, claude-mem 13.15.3 match; caveman `package.json` 2.2.0 ≠ tag — commit pinned instead; task-observer / icm-architect ship no `package.json` — commit pinned.)
