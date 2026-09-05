# Staff Authentication API

Status: backend foundation implemented; live Auth0 development-tenant acceptance pending.

All paths are relative to `API_PREFIX` from `@rc/shared`, currently `/api/v1`. The JSON
contracts and named permissions live in `shared/src/api.ts`. The endpoints use Auth0 only
to prove identity; application roles and permissions come exclusively from the local
`StaffIdentity` record.

## Endpoint summary

| Method | Path             | Purpose                                       | Success |
| ------ | ---------------- | --------------------------------------------- | ------- |
| `GET`  | `/auth/login`    | Start Authorization Code + PKCE               | `302`   |
| `GET`  | `/auth/callback` | Validate the one-time OIDC response           | `303`   |
| `GET`  | `/auth/session`  | Read the current local staff session and CSRF | `200`   |
| `POST` | `/auth/logout`   | Revoke the local session and clear cookies    | `200`   |

Every auth response sets `Cache-Control: no-store` and `X-Robots-Tag: noindex,
nofollow`. Provider tokens are never returned by these endpoints.

## `GET /auth/login`

An optional `returnTo` query value must exactly match one URL in
`AUTH_ALLOWED_RETURN_URLS`. Partial matches, extra paths, query strings, fragments and
other origins return `400`. When omitted, the first configured URL is used.

The endpoint creates a ten-minute one-time transaction in MongoDB, sets an opaque
`HttpOnly`, `SameSite=Lax` transaction cookie, and redirects to Universal Login. The
authorization request includes random state, nonce and PKCE values with
`code_challenge_method=S256`, plus
`acr_values=http://schemas.openid.net/pape/policies/2007/06/multi-factor` to require the
configured Auth0 MFA step. It is independently limited to ten starts per IP per 15
minutes.

## `GET /auth/callback`

The callback consumes the transaction atomically before exchanging the code, preventing
replay. `openid-client` validates state, nonce, PKCE, issuer, audience, signature and
token expiry. Any failed validation returns the same `401 Authentication failed.`
envelope and clears the transaction cookie.

A valid provider identity must then match an active local record by exact `(issuer,
subject)`, have the local `admin` role, and contain the configured authentication-method
evidence, currently an `amr` array containing `mfa`. Auth0 adds that hosted-flow evidence
only after a completed MFA challenge. A primary passkey is not inferred to be MFA.
Unknown, disabled, unassigned, missing/empty `amr`, password-only, primary-passkey-only
and other incorrect assurance results receive no application session.

Success revokes any existing browser session, creates a new local opaque session, sets
the session cookie and redirects to the stored exact `returnTo` URL. No provider token
or application token is placed in the redirect URL.

## `GET /auth/session`

Requires the backend session cookie. Success returns `CurrentSessionResponse` with the
local staff display fields, local role, derived named permissions, session expiry times
and a session-bound CSRF token. It does not expose the provider subject, provider tokens,
cookie value or stored session hash.

Missing, malformed, revoked, idle-expired, absolute-expired, disabled-staff and stale
authorization-version sessions return the shared `401` error envelope.

## `POST /auth/logout`

For an authenticated session, the request must have:

- `Origin` exactly equal to the configured frontend origin; and
- `X-CSRF-Token` exactly equal to the token returned by `/auth/session` for that session.

Missing, invalid and cross-session tokens return `403`. Success revokes the MongoDB
session before clearing both auth cookies and returns `{ "status": "logged-out" }`.
Repeating logout without a session is safe, but the exact allowed `Origin` is still
required.

A successful logout transition also records exactly one `auth.session.revoked` event
with the safe database session ID and reason `logout`, followed by the existing
`auth.logout.succeeded` event. Repeated logout does not report another revocation.

The endpoint performs application logout. It does not yet clear Auth0's own Universal
Login SSO cookie, so a later login may complete without another credential prompt.

## Authorization middleware

Protected Phase 3A routes must compose authentication, origin/CSRF protection for writes,
and one named permission. The initial local `admin` role receives:

- `property:read-private`
- `property:write`
- `property:publish`
- `property:change-availability`
- `inquiry:read`
- `inquiry:update`
- `audit:read`

Permission checks deny by default. Anonymous access returns `401`; an authenticated
identity missing a required permission returns `403`; a service may return the common
protected-resource `404 Resource not found.` response when revealing existence would
disclose protected information. No property-management or inquiry-management route is
introduced by this foundation.

## Error and audit boundary

All failures use `ApiErrorResponse`. Callback codes, tokens, cookies, CSRF values,
passwords and inquiry bodies are excluded from API errors and structured audit events.
Audit details accept only predefined reason codes, permission names and revoked-session
counts. Successful session rotation, logout, concurrent-limit eviction, staff
deactivation and detected role/status/authorization-version changes each record
`auth.session.revoked`. Events contain a database session ID or safe count, never the raw
session token or stored hash.
