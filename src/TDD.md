# TDD.md — Technical Design Decisions

> **TBD policy.** When you encounter a TBD reference in any document, look it up in the Master TBD Tracker at the bottom of this file. If status is **open**: stub it, leave a `TODO: TBD-XXX` comment, and continue. **Do not guess** at the resolution. This file lives in `src/`, beside the code it binds to.

---

## Stack Decisions

| Layer                      | Decision                                      | Rationale                                                    | TBD      |
|----------------------------|-----------------------------------------------|--------------------------------------------------------------|----------|
| Frontend framework         | [e.g. React Native (Expo)]                    | [e.g. Cross-platform, managed workflow, OTA updates]         |          |
| Backend framework          | [e.g. Haskell/Servant, Node/Express, etc.]    | [e.g. Type safety, performance, team familiarity]            |          |
| Database                   | [e.g. PostgreSQL 16]                          | [e.g. JSONB support, mature ecosystem, managed hosting]      |          |
| Cache                      | [e.g. Redis, none for MVP]                    | [e.g. Session storage, rate limiting]                        | TBD-001  |
| File storage               | [e.g. S3, DigitalOcean Spaces]                | [e.g. User uploads, media assets]                            | TBD-002  |
| Push notifications         | [e.g. Expo Push, Firebase Cloud Messaging]    | [e.g. Mobile alerts, engagement]                             | TBD-003  |
| Authentication pattern     | [e.g. JWT with refresh rotation]              | [e.g. Stateless, standard, supports mobile and web]          |          |
| Deployment platform        | [e.g. DigitalOcean App Platform, AWS, Vercel] | [e.g. Managed infrastructure, CI/CD integration]             |          |
| CI/CD                      | [e.g. GitHub Actions]                         | [e.g. Free tier, native GitHub integration]                  |          |
| State management (frontend)| [e.g. React Context + hooks, Zustand, Redux]  | [e.g. Simplicity for MVP, scalable if needed]                | TBD-004  |

---

## Universal Implementation Patterns

These patterns are correct for virtually every full-stack project. Follow them unless the Stack Decisions table above explicitly overrides one.

### Authentication & Sessions

- **Passwords:** bcrypt. Cost factor benchmarked on target server before setting (aim for ~250ms hash time).
- **JWT access token:** Short-lived ([TBD — e.g. 15 minutes]). Contains at minimum: `user_id`, `role`. Never contains PII beyond what is needed for authorization.
- **JWT refresh token:** Long-lived ([TBD — e.g. 7 days]). Stored in a secure, platform-appropriate store — never in localStorage, AsyncStorage, or logs.
- **On access token expiry:** Auto-refresh via `POST /auth/refresh`. If refresh fails, redirect to login. Client clears all stored tokens on redirect.

> **Note about auth model:** These patterns assume JWT-based email/password authentication. If your project uses OAuth, magic links, phone/SMS auth, or SSO, adapt the token lifecycle to your auth model. The security principles (short-lived access tokens, secure storage, never logging credentials) remain universal.

### Input Validation

- **Client-side:** UX convenience only — can be bypassed. Never rely on it for security.
- **Server-side:** Security boundary — always enforced regardless of client behavior.
- **Validation errors:** HTTP 400 with `field` property in the error object identifying the rejected input.

### Database Transactions

- Any operation modifying more than one table uses a DB transaction.
- On transaction failure: full rollback, no partial writes.
- Log the failure with request ID for debugging; return a generic error to the client.

### Soft Delete

- **Pattern:** `deleted_at TIMESTAMPTZ`, `deleted_by UUID REFERENCES users(id)`.
- **All public queries:** `WHERE deleted_at IS NULL`. No exceptions.
- **Admin queries:** May omit this filter when explicitly viewing deleted records.
- **Never hard-delete** user-generated content. Hard deletes are reserved for orphaned system records or compliance-mandated purges.

### Caching

- Cache invalidated on write to the underlying data.
- On cache unavailable: fall back to DB query, log the cache failure, no user-facing error.
- Cache keys namespaced by resource type and ID to prevent collisions.

### Role Enforcement

- Role read from JWT claim only. Never trusted from request body or query params.
- Role checks enforced as **middleware before handler logic**, not inside handler.
- Unknown or missing role claim: reject with 403.

### Logging

- **Never log:** PII, passwords, tokens, full request/response bodies containing sensitive data.
- **Always log:** request ID, route, HTTP status code, response duration, `user_id` (not email), role.
- **Production:** Sanitized error messages only. No stack traces in API responses.

### Environment Variables

- All secrets in environment variables — never hardcoded.
- All variables documented in `.env.example` with descriptions and example values.
- `.env` file never committed to version control.

### Error Responses

- Always use the standard error envelope defined in `CLAUDE.md`.
- Never reveal: which credential was wrong (login), whether an email exists (forgot password), or internal stack traces (production).
- Validation errors include the `field` property; all other errors omit it.

---

## Security Rules — Quick Reference

| #  | Rule                                                          | Implementation                                                                    |
|----|---------------------------------------------------------------|-----------------------------------------------------------------------------------|
| 1  | Passwords hashed before storage                               | bcrypt with benchmarked cost factor                                               |
| 2  | JWT stored securely                                           | Platform-appropriate secure store; never localStorage/AsyncStorage/logs            |
| 3  | Role from JWT claim only                                      | Middleware extracts and validates before handler executes                          |
| 4  | Server-side input validation                                  | Every endpoint validates all inputs regardless of client-side validation           |
| 5  | Parameterized queries                                         | Never concatenate user input into SQL strings                                     |
| 6  | Soft delete filter on public queries                          | `WHERE deleted_at IS NULL` appended to every public query on soft-deletable tables|
| 7  | Multi-table writes in transactions                            | Full rollback on any failure; no partial writes                                   |
| 8  | PII excluded from analytics and exports                       | Enforced at query construction, not post-filter                                   |
| 9  | Schema docs updated with code                                 | `src/ERD.md` and `src/API.md` updated in the same session as related code changes |
| 10 | TBDs stubbed, never guessed                                   | `TODO: TBD-XXX` comment; look up status in this file                              |

---

## Performance Targets

| Metric                            | Target                     | Measurement Method                                |
|-----------------------------------|----------------------------|---------------------------------------------------|
| API p95 response time             | [e.g. < 200ms]            | [e.g. Application monitoring / load test]         |
| Time to interactive (frontend)    | [e.g. < 3s on 4G]         | [e.g. Lighthouse, WebPageTest]                    |
| Database query p95                | [e.g. < 50ms]             | [e.g. Slow query log threshold]                   |
| Uptime target                     | [e.g. 99.9%]              | [e.g. Monitoring service]                         |
| Max concurrent users (MVP)        | [e.g. 100]                | [e.g. Load test with realistic user flows]        |

---

## Master TBD Tracker

This is the canonical TBD log. **All TBDs from all other documents resolve here.**

When a TBD is resolved:
1. Update **Status** to `Resolved` and fill in **Resolution**.
2. Record the reasoning in `planning/decisions/YYYY-MM-DD_title.md` (this tracker holds the status; the decision record holds the why).
3. Remove it from `CLAUDE.md`'s Key Open TBDs table.
4. Update any document that referenced it.
5. Build the feature that was blocked.

| TBD ID   | Description                                                    | Blocks (Document + Feature)                        | Status | Resolution |
|----------|----------------------------------------------------------------|----------------------------------------------------|--------|------------|
| TBD-001  | [e.g. Cache provider selection]                                | [TDD — caching patterns; ERD — session storage]    | Open   |            |
| TBD-002  | [e.g. File storage provider and bucket strategy]               | [Integration Spec — file upload; API — upload endpoint] | Open   |            |
| TBD-003  | [e.g. Push notification service]                               | [Integration Spec — notifications; Mobile IA — notification screen] | Open   |            |
| TBD-004  | [e.g. Frontend state management approach]                      | [TDD — state management; Mobile/Web IA — global state] | Open   |            |
| TBD-005  | [e.g. Access token TTL]                                        | [API — auth endpoints; TDD — session patterns]     | Open   |            |
| TBD-006  | [e.g. Refresh token TTL]                                       | [API — auth endpoints; TDD — session patterns]     | Open   |            |
| TBD-007  | [e.g. Password reset token expiry duration]                    | [API — forgot-password endpoint]                   | Open   |            |
| TBD-008  | [e.g. Rate limiting strategy and thresholds]                   | [API — all public endpoints; TDD — security rules] | Open   |            |

> **TBD policy:** If a TBD blocks implementation, stub it, leave a `TODO: TBD-XXX` comment, and continue. Do not guess. When a TBD is resolved, record the reasoning in `planning/decisions/YYYY-MM-DD_title.md`.

---

## Changes Made

**Treatment: content file (schema-of-record) — surgical (per the hybrid approach).**

- **TBD-policy blockquote** gained one sentence noting the file lives in `src/`.
- **Security Rule 9** now reads `src/ERD.md` and `src/API.md` (was unprefixed `ERD.md` / `API.md`), making the schema-doc locations explicit and consistent with the reorg.
- **Master TBD Tracker resolution workflow** gained a step (now step 2): record the reasoning in `planning/decisions/`. Renumbered the subsequent steps. The closing TBD-policy blockquote gained the same pointer.
- **Everything else preserved exactly:** the Stack Decisions table, all Universal Implementation Patterns, the auth-model note, the 10-row Security Rules quick reference (only Rule 9's paths changed), Performance Targets, and the full TBD tracker table. The `CLAUDE.md` references in Error Responses and the tracker workflow are unchanged — `CLAUDE.md` stayed at the repo root.
- **Note:** the "Blocks" column still uses short doc names (TDD, ERD, API, Integration Spec, Mobile IA) rather than full paths. These are human-readable labels, not file references, so I left them as-is to avoid bloating the table. Flag me if you want them pathed.
