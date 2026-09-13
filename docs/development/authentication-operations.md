# Staff Authentication Operations and Production Gate

Status: **Level 6 engineering controls implemented; development-tenant live acceptance
and production environment decisions remain open**

This runbook is for trusted RC Premier operators. It does not create a public staff
registration path. Auth0 owns credentials, MFA and authenticator recovery;
Express owns the local `StaffIdentity` allowlist, roles, permissions, sessions,
revocation, CSRF, origin enforcement and application audit records.

## Production configuration gate

Production must use separate Auth0, MongoDB and application secrets. Never copy the
development tenant, staff connection, database or secret values into production. Before
starting a production process, set and review:

| Variable                       | Production requirement                                   |
| ------------------------------ | -------------------------------------------------------- |
| `NODE_ENV`                     | Exactly `production`                                     |
| `MONGODB_URI`                  | Production database URI from the deployment secret store |
| `CORS_ORIGIN`                  | Exact HTTPS frontend origin; never `*`                   |
| `TRUST_PROXY_HOPS`             | Exact proxy hop count, or `0` for a direct connection    |
| `AUTH0_ISSUER_URL`             | Exact HTTPS production issuer with no path               |
| `AUTH0_CLIENT_ID`              | Production Regular Web Application client ID             |
| `AUTH0_CLIENT_SECRET`          | Production secret-store value                            |
| `AUTH0_CALLBACK_URL`           | Exact HTTPS backend callback                             |
| `AUTH_ALLOWED_RETURN_URLS`     | Comma-separated exact HTTPS frontend destinations        |
| `AUTH_SESSION_HASH_SECRET`     | Independent random secret of at least 32 characters      |
| `AUTH_REQUIRED_AMR`            | Exactly `mfa`; a change requires code review             |
| `AUTH_SESSION_IDLE_MINUTES`    | Approved policy, no more than `30`                       |
| `AUTH_SESSION_ABSOLUTE_HOURS`  | Approved policy, no more than `8`                        |
| `AUTH_MAX_CONCURRENT_SESSIONS` | Approved policy, no more than `3`                        |
| `AUTH_TRANSACTION_MINUTES`     | Approved policy, no more than `10`                       |

If authentication is absent or partial in production, startup fails. HTTP frontend,
callback or return URLs also fail production validation. Every environment requires
verified `amr: mfa`; the development signed-passkey exception is retired. A database or
Auth0 outage returns an availability error and never creates or authorizes a session.

Production validation also rejects an assurance value other than `mfa` or lifetimes and
concurrency above the reviewed baseline. Tightening a value is allowed; weakening it
requires a deliberate code and documentation change rather than an environment typo.

`TRUST_PROXY_HOPS=0` is the safe default. Set a nonzero value only after documenting the
actual reverse-proxy chain and preventing direct traffic from bypassing it. This keeps
IP-based rate limits from trusting caller-supplied forwarding headers.

The frontend build must explicitly set `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_SITE_URL` to the approved production HTTPS origins. Their localhost
fallbacks exist for local development and do not grant backend access, but a production
release must not be accepted while either generated URL still points to localhost.

## Production Auth0 dashboard checklist

- Use a production **Regular Web Application**, not the development application.
- Use current Universal Login with Classic/custom login disabled.
- Enable only the dedicated invited-staff database connection; keep public signup off.
- Do not enable public social connections, Organizations or Auth0 Roles for application
  authorization.
- Allow only the exact production callback, web-origin and logout URLs. Do not use
  wildcards.
- Keep Authorization Code enabled; do not enable Implicit, Password, Client Credentials,
  Refresh Token or the MFA API grant for this browser flow.
- For Beta, use database/password login, policy **Always**, authenticator OTP/TOTP and
  recovery codes; disable passkeys, both WebAuthn factors and public signup. Configure
  production MFA with policy **Always** and an independently approved factor,
  and verify that a completed challenge produces signed `amr: ["mfa"]` evidence.
- Remove the retired development Post-Login passkey-evidence Action during manual
  migration; do not fabricate MFA claims. Follow [the exact Beta runbook](auth0-setup.md).

The production Auth0 plan/factor, tenant, domains and same-site frontend/API topology
are not yet approved. Production authentication therefore remains blocked even though
the application-side fail-closed controls are implemented.

## Create or reactivate an administrator

Approve the exact Auth0 `user_id` through a private channel. From the repository root,
with the intended ignored environment file active, run:

```bash
npm run auth:provision-admin --workspace backend -- --issuer "https://<tenant>/" --subject "auth0|..." --email "rcpremierph@gmail.com" --name "Renzo & Criezel"
```

`--issuer` is mandatory and must exactly match `AUTH0_ISSUER_URL`. The command creates
or updates only that `(issuer, subject)` record, assigns the local `admin` role,
increments the authorization version on updates, revokes existing local sessions and
writes allowlisted audit metadata. It handles no password and exposes no HTTP endpoint.

## Disable staff and revoke sessions

For removal, suspected compromise, factor replacement or recovery, run:

```bash
npm run auth:disable-staff --workspace backend -- --issuer "https://<tenant>/" --subject "auth0|..."
```

The exact issuer must match configuration. The command changes an active local identity
to `disabled`, increments its authorization version, revokes every active local session
and writes one safe revocation event per transition plus the staff-deactivation event.
An already disabled or unknown identity is not modified.

Every protected request also reloads the local staff record and compares the session's
authorization version. This means a disabled or changed identity fails with `401` even
if a race or audit failure prevented proactive session cleanup. Deleting or blocking an
Auth0 account does not update `StaffIdentity`; run the local disable command separately.
Do not delete the local record merely because the provider account was deleted. Its
retention is tied to the unapproved audit/data-retention policy.

## Authenticator recovery

1. Disable the local identity first so its application sessions are revoked.
2. Verify the staff member through the privately approved operator process. Do not use
   security questions or an email-only application bypass.
3. Use Auth0's operator recovery/factor-reset controls. RC Premier never handles the
   password, TOTP seed, QR or recovery credential material.
4. Review recent safe audit events for suspicious login, revocation and denied-access
   activity.
5. After the new factor is enrolled and independently confirmed, run the provisioning
   command with the exact approved issuer and current subject to reactivate access. If
   Auth0 issued a new subject, provision that new pair and leave the old pair disabled.
6. Complete the live password/TOTP MFA, application-session, protected-action and logout
   checks before closing the recovery incident.

Ownership for recovery approval, staff invitation, deactivation and security-event
review must be assigned before production.

## Session, browser and header controls

The browser receives only the host-only application session cookie. Production uses a
`__Host-` name with `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/`. The frontend keeps
the session-bound CSRF value in React memory and sends it only in the custom header for
approved-origin mutations. Logout revokes the local session; it does not terminate the
Auth0 SSO session. Login still requests `prompt=login`.

Express uses Helmet, including a CSP suitable for its JSON surface, clickjacking and
content-type protections. HSTS is emitted only in production. Next.js sends
clickjacking, content-type, referrer and browser-feature policies on every page, and
adds `no-store` plus `noindex` headers to `/admin`. A frontend CSP is intentionally not
guessed while the production media/map origins and a nonce-compatible Next.js policy
remain undecided; this is a production security blocker to test after those origins are
approved, not permission to deploy an unreviewed policy.

## Failure modes and remaining acceptance

- MongoDB unavailable: session and staff verification return `503`; no fallback identity
  or test session exists. Non-development server startup refuses the failed connection.
- Auth0 discovery/token exchange unavailable: login returns `503` or the callback's
  generic `401`; no application session is created.
- Unknown, disabled, unassigned, wrong-issuer or insufficient-assurance identity: the
  public response is the same generic `401 Authentication failed.`
- Expired, revoked or authorization-stale application session: `401`; the admin shell
  returns to an anonymous state.
- Revocation and audit insert are separate writes. Revocation remains effective if the
  audit insert fails, but the missing-event risk needs production alerting or a later
  replica-set transaction/outbox decision.
- Authentication and database errors are reduced to bounded redacted messages; raw
  callback URLs, Error objects and configured secrets are not logged.

Complete the development-tenant manual procedure in
[`auth0-setup.md`](auth0-setup.md). Production acceptance additionally requires the real
domains, HTTPS/proxy topology, MFA plan and factor, frontend CSP, audit retention,
recovery ownership and a live end-to-end session/logout check. Record only observed
passes; mark unavailable provider or plan checks blocked.
