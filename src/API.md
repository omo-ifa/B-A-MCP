# API.md — API Endpoint Specification

> **Schema-of-record rule.** This document must be updated in the same session as any code change that affects it. It is never acceptable for this document to describe a schema or endpoint that no longer matches the code. This file lives in `src/`, beside the code it binds to — that placement is the reminder.

---

## Base URLs

| Environment | URL                                    |
|-------------|----------------------------------------|
| Production  | [e.g. `https://api.yourproduct.com`]   |
| Staging     | [e.g. `https://staging-api.yourproduct.com`] |
| Local       | [e.g. `http://localhost:3000`]         |

---

## Authentication

| Field                 | Value                                                                                     |
|-----------------------|-------------------------------------------------------------------------------------------|
| Method                | JWT Bearer Token                                                                          |
| Header format         | `Authorization: Bearer {access_token}`                                                    |
| Token storage         | Secure, platform-appropriate store — never in localStorage, AsyncStorage, or logs. [TBD: specify exact storage mechanism per platform target.] |
| Access token TTL      | [TBD — e.g. 15 minutes]                                                                  |
| Refresh token TTL     | [TBD — e.g. 7 days]                                                                      |
| Refresh endpoint      | `POST /auth/refresh`                                                                      |

---

## Roles

| Role           | Description                                                         |
|----------------|---------------------------------------------------------------------|
| `[role_1]`     | [e.g. Standard authenticated user. Can manage own resources.]       |
| `[role_2]`     | [e.g. Elevated user with moderation capabilities.]                  |
| `[role_3]`     | [e.g. System administrator. Full access.]                           |
| `[role_4]`     | [e.g. Service account for background jobs. No UI access.]           |

---

## Standard Error Format

```json
{
  "error": {
    "code": "SNAKE_CASE_ERROR_CODE",
    "message": "Human-readable description of the problem",
    "field": "optional — used for validation errors"
  }
}
```

The `field` property is included only for validation errors to identify which input was rejected.

---

## Pagination

Default pagination for all list endpoints:

**Request:** `?page=1&per_page=20`

**Response envelope:**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 142
  }
}
```

---

## Endpoints

> **Note about the Auth resource below.** The following auth endpoints assume email/password authentication, which is the most common pattern. If your project uses OAuth, magic links, phone/SMS auth, or SSO, **replace this entire section** with endpoints matching your auth model. Do not build on these defaults if they conflict with your chosen auth approach.

### Auth

#### `POST /auth/register`

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "[default_role]",
    "created_at": "ISO8601"
  },
  "access_token": "jwt",
  "refresh_token": "jwt"
}
```

**Errors:**

| Code                   | Status | Condition                              |
|------------------------|--------|----------------------------------------|
| `VALIDATION_ERROR`     | 400    | Missing or invalid fields              |
| `EMAIL_ALREADY_EXISTS` | 409    | Email already registered               |

**Notes:** Password hashed with bcrypt before DB write. Email uniqueness enforced at DB level (`users` table, UNIQUE constraint on `email`). Never reveal whether email exists in generic error messages — the 409 is acceptable here because the user is explicitly trying to register.

---

#### `POST /auth/login`

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "[role]"
  },
  "access_token": "jwt",
  "refresh_token": "jwt"
}
```

**Errors:**

| Code                 | Status | Condition                                           |
|----------------------|--------|-----------------------------------------------------|
| `INVALID_CREDENTIALS`| 401    | Email not found **or** password mismatch            |
| `ACCOUNT_DISABLED`   | 403    | `is_active = false` on the user record              |

**Notes:** Always return `INVALID_CREDENTIALS` for both wrong email and wrong password — never reveal which credential was incorrect. Check `is_active` flag after password verification.

---

#### `POST /auth/refresh`

**Auth:** None (refresh token in body)

**Request:**
```json
{
  "refresh_token": "jwt"
}
```

**Response `200`:**
```json
{
  "access_token": "jwt",
  "refresh_token": "jwt"
}
```

**Errors:**

| Code                | Status | Condition                         |
|---------------------|--------|-----------------------------------|
| `INVALID_TOKEN`     | 401    | Token expired, malformed, or revoked |

**Notes:** Issue new access + refresh token pair. Invalidate the old refresh token (rotation). If refresh fails, client redirects to login.

---

#### `POST /auth/forgot-password`

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response `200`:**
```json
{
  "message": "If an account exists with that email, a reset link has been sent."
}
```

**Errors:** None surfaced to client — always return 200 regardless of whether the email exists.

**Notes:** Never reveal whether the email exists in the system. Generate a time-limited token, store its hash in the DB, and send the reset link via email. Token expiry: [TBD].

---

#### `POST /auth/reset-password`

**Auth:** None (reset token in body)

**Request:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newSecurePassword123"
}
```

**Response `200`:**
```json
{
  "message": "Password has been reset successfully."
}
```

**Errors:**

| Code                  | Status | Condition                               |
|-----------------------|--------|-----------------------------------------|
| `INVALID_TOKEN`       | 400    | Token expired, already used, or invalid |
| `VALIDATION_ERROR`    | 400    | Password does not meet requirements     |

**Notes:** Hash new password with bcrypt. Invalidate the reset token after use. Optionally invalidate all existing sessions for the user.

---

### [Resource Name]

[One paragraph. Describe what this resource represents and who interacts with it.]

#### `GET /[resources]`

**Auth:** `[role_1]` or higher

**Query params:**
- `page` (integer, default 1)
- `per_page` (integer, default 20, max 100)
- `[filter_field]` (optional — [describe filter])
- `sort` (optional — [describe sort options])

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "[field_1]": "[value]",
      "[field_2]": "[value]",
      "created_at": "ISO8601"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 42
  }
}
```

**Errors:**

| Code              | Status | Condition            |
|-------------------|--------|----------------------|
| `UNAUTHORIZED`    | 401    | Missing or invalid token |

**Notes:** Query `[table_name]` with `WHERE deleted_at IS NULL`. Apply pagination. [Add resource-specific query notes here.]

---

#### `GET /[resources]/:id`

**Auth:** `[role_1]` or higher

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "[field_1]": "[value]",
    "[field_2]": "[value]",
    "[nested_relation]": { ... },
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

**Errors:**

| Code              | Status | Condition                                 |
|-------------------|--------|-------------------------------------------|
| `UNAUTHORIZED`    | 401    | Missing or invalid token                  |
| `NOT_FOUND`       | 404    | ID does not exist or is soft-deleted      |

**Notes:** Fetch from `[table_name]` by `id` with `WHERE deleted_at IS NULL`. Include [describe any joined/nested data].

---

#### `POST /[resources]`

**Auth:** `[role_1]` or higher

**Request:**
```json
{
  "[field_1]": "[value — describe constraints]",
  "[field_2]": "[value — describe constraints]"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "[field_1]": "[value]",
    "[field_2]": "[value]",
    "created_at": "ISO8601"
  }
}
```

**Errors:**

| Code               | Status | Condition                           |
|--------------------|--------|-------------------------------------|
| `UNAUTHORIZED`     | 401    | Missing or invalid token            |
| `VALIDATION_ERROR` | 400    | Missing or invalid fields           |
| `[CONFLICT_CODE]`  | 409    | [Describe uniqueness violation]     |

**Notes:** Insert into `[table_name]`. Set `user_id` from JWT claim — never from request body. [Add resource-specific creation notes here.]

---

### Admin

[Admin endpoints require elevated role. All actions on user records must be audit-logged.]

#### `GET /admin/users`

**Auth:** `[admin_role]`

**Query params:**
- `page`, `per_page` (standard pagination)
- `role` (optional — filter by role)
- `is_active` (optional — filter by account status)
- `include_deleted` (optional, default false — if true, omit `WHERE deleted_at IS NULL`)

**Response `200`:** Same envelope as list endpoints. Each user object includes: `id`, `email`, `role`, `is_active`, `created_at`, `updated_at`.

**Errors:**

| Code           | Status | Condition                               |
|----------------|--------|-----------------------------------------|
| `UNAUTHORIZED` | 401    | Missing or invalid token                |
| `FORBIDDEN`    | 403    | Authenticated but insufficient role     |

**Notes:** Role enforced as middleware before handler. Query `users` table. When `include_deleted` is false (default), append `WHERE deleted_at IS NULL`.

---

#### `PATCH /admin/users/:id/role`

**Auth:** `[admin_role]`

**Request:**
```json
{
  "role": "[new_role]"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "role": "[new_role]",
    "updated_at": "ISO8601"
  }
}
```

**Errors:**

| Code               | Status | Condition                            |
|--------------------|--------|--------------------------------------|
| `UNAUTHORIZED`     | 401    | Missing or invalid token             |
| `FORBIDDEN`        | 403    | Insufficient role                    |
| `NOT_FOUND`        | 404    | User ID does not exist               |
| `VALIDATION_ERROR` | 400    | Invalid role value                   |

**Notes:** Role enforced as middleware. Update `users` table `role` column. Audit log: actor `user_id`, target `user_id`, old role, new role, timestamp, IP address. See `planning/RBAC_Specification.docx` for the full permission matrix.

---

## TBD Tracker

| TBD ID   | Description                                                     | Blocks                           | Status |
|----------|-----------------------------------------------------------------|----------------------------------|--------|
| TBD-A001 | [e.g. Access token TTL — affects session management]            | [Auth endpoints]                 | Open   |
| TBD-A002 | [e.g. Refresh token TTL — affects session persistence]          | [Auth endpoints]                 | Open   |
| TBD-A003 | [e.g. Rate limiting strategy — affects all public endpoints]    | [Middleware implementation]      | Open   |

> **TBD policy:** If a TBD blocks implementation, stub it, leave a `TODO: TBD-XXX` comment, and continue. Do not guess. When a TBD is resolved, record the reasoning in `planning/decisions/YYYY-MM-DD_title.md`.

---

## Changes Made

**Treatment: content file (schema-of-record) — surgical (per the hybrid approach).**

- **Schema-of-record blockquote** gained one sentence noting the file lives in `src/` and that placement is the update reminder.
- **Path updated:** the `PATCH /admin/users/:id/role` notes now reference `planning/RBAC_Specification.docx` (was `docs/RBAC_Specification.docx`).
- **TBD policy** gained one sentence pointing resolved-TBD reasoning to `planning/decisions/`.
- **Everything else preserved exactly:** all base URLs, auth config, roles, error format, pagination, every endpoint spec (request/response/errors/notes), the auth-model replacement note, and the TBD tracker. The endpoint specifications are proven schema-of-record content and were not touched.
