# Authentication Models

Status: implemented Mongoose schemas and service wiring; live project-database
acceptance pending.

These collections support invited Phase 3A staff only. They do not create public users,
clients, agents, profiles or any deferred account schema.

## `StaffIdentity`

The local allowlist stores the stable provider `issuer` and `subject`, local display name
and normalized email, optional local role, active/disabled status, an authorization
version, last login and normal timestamps.

Indexes:

- unique compound `{ issuer: 1, subject: 1 }` identity boundary;
- `{ status: 1, role: 1 }` for authorization operations; and
- `{ email: 1 }` for controlled staff lookup.

Email and Auth0 roles/claims are never authorization keys. The initial application role
is only `admin`; `null` represents an intentionally unassigned identity that cannot
receive a session.

## `AuthSession`

The browser receives a random 256-bit opaque identifier. MongoDB stores only its
domain-separated HMAC-SHA-256 hash, never the identifier itself. The record references
the staff identity and captures the staff authorization version, creation and bounded
activity times, idle and absolute expiry, effective cleanup expiry and optional
revocation reason/time.

Indexes:

- unique `{ sessionHash: 1 }` lookup;
- TTL `{ expiresAt: 1 }` with `expireAfterSeconds: 0`; and
- `{ staffIdentity: 1, revokedAt: 1, createdAt: -1 }` for revocation and the concurrent
  session limit.

Authorization checks expiry explicitly; the TTL index is cleanup only. Activity is
touched at most once every five minutes. Idle expiry defaults to 30 minutes, absolute
expiry to eight hours, and a fourth concurrent login revokes the oldest active session.
Store revocation methods use a `revokedAt`-absent condition and return only sessions that
actually transitioned, preventing repeated logout or racing revokers from reporting a
false second success.

## `OidcTransaction`

A ten-minute one-time record binds the opaque transaction cookie to a keyed state hash,
nonce, PKCE verifier and exact return URL. Callback consumption is atomic and records
`consumedAt`, so success and failure both prevent replay. Transaction identifiers, state
hashes, nonces and verifiers are excluded from normal selection. A TTL index removes
expired records.

Provider ID, access and refresh tokens are never persisted.

## `SecurityAuditEvent`

Append-only authentication events record a local actor reference when one exists,
predefined action and outcome, entity type/identifier, server-generated request ID,
timestamp and a deliberately small details object. Details allow only a reason code,
named permission and revoked-session count.

Every actual session-revocation transition emits `auth.session.revoked`. Rotation,
logout, concurrent-limit eviction, staff disablement and role/status/authorization-
version changes record the safe MongoDB session ID and predefined reason. Staff
deactivation and administrator reprovisioning also retain a safe aggregate count on
their higher-level event.

Indexes support newest-first review, actor history and action history. There is no TTL
index because the application retention period has not been approved. Events cannot
store callback codes, provider tokens, cookies, CSRF values, passwords, arbitrary text,
inquiry messages or complete data snapshots.

Revocation and audit insertion are currently separate writes. The conditional session
update is atomic, but the following audit insert is not in the same MongoDB transaction.
This supports standalone local MongoDB; multi-document transactions require a replica
set. A failed audit insert therefore fails the request closed without undoing a completed
revocation, but can leave that transition without its event. Production must approve
this limitation with alerting or add a replica-set transaction/outbox before launch.

## Controlled administrator bootstrap

No public provisioning endpoint exists. After creating the Auth0 user, an authorized
operator runs the local CLI with the exact Auth0 `user_id` subject. The issuer always
comes from validated backend configuration. Re-running the command updates/reactivates
that identity, increments its authorization version, revokes its existing sessions,
records one revocation event per actual transition and records the aggregate on the
provisioning event.
