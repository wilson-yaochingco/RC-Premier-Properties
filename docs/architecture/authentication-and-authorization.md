# Phase 3A Authentication and Authorization

Status: **accepted architecture; not implemented**

This decision defines the security boundary for the Phase 3A listing-management slice.
It does not expose an admin API, create staff accounts, or select a vendor. Implementation
must not begin until the provider and deployment inputs in [Implementation gates](#implementation-gates)
are approved.

## Decision

RC Premier Properties will delegate staff authentication to a managed OpenID Connect
(OIDC) identity provider. The provider owns credentials, authenticator enrollment,
account recovery and MFA. The Express backend owns the application session, staff
allowlist, role and permission checks, and audit trail.

The browser will receive only an opaque, backend-issued session cookie. Provider tokens,
refresh tokens and the application session identifier must not be stored in
`localStorage`, `sessionStorage`, readable JavaScript cookies, URLs or application logs.

Phase 3A starts with one application role, `admin`. It is an invited staff role with the
permissions needed for Phase 3A property and inquiry administration. `agent` and
`client` roles, public sign-up, client accounts and agent-scoped ownership are deferred
until their roadmap phases. Provider authentication alone never grants application
access: the authenticated provider subject must also map to an active local staff
identity.

## Why this approach

A managed provider reduces the amount of credential, MFA and recovery code that this
small application must implement and operate. It does not outsource authorization:
provider groups or profile claims are not trusted as the sole source of RC Premier
Properties permissions.

An opaque backend session fits the existing browser-to-Express architecture and permits
immediate revocation, idle expiry and server-side authorization without exposing bearer
tokens to browser JavaScript. It also avoids treating a long-lived self-contained token
as an irrevocable staff session.

Alternatives not selected:

- Locally managed passwords and TOTP would make this application responsible for
  password storage, factor recovery, breach response and sensitive authentication code.
- Browser-held access and refresh tokens increase the impact of script compromise and
  make application logout and revocation harder to reason about.
- Trusting an identity-provider role claim directly would couple business authorization
  to vendor configuration and could admit a valid provider user who was never approved
  as staff.

## Scope and non-goals

This decision covers staff login, logout, session lifecycle, authorization for Phase 3A
admin operations, staff provisioning and security audit events.

It does not add:

- public registration or client authentication;
- agent profiles or agent-specific data access;
- favorites, confirmed viewing appointments or seller accounts;
- a full CRM or user-management dashboard;
- email, SMS or notification providers;
- authentication or authorization code in this documentation change.

## Trust boundaries

```text
Staff browser
   |  OIDC authorization redirect (Authorization Code + PKCE)
   v
Managed identity provider  ---- verified identity result ---->  Express API
                                                               |          |
                                                               |          +--> audit events
                                                               v
                                                        MongoDB sessions
                                                               |
                                                               v
                                             authorized property/inquiry operations
```

The identity provider proves who authenticated. Express independently decides whether
that identity is active staff and whether the requested action is permitted. MongoDB is
the revocable session and application-authorization store; it does not store staff
passwords or MFA secrets.

## Authentication flow

1. The backend starts an OIDC Authorization Code flow with PKCE using the `S256`
   challenge method. It generates transaction-specific `state`, `nonce` and PKCE values.
2. Login and callback return locations use an exact allowlist. A query parameter must
   never become an arbitrary post-login redirect.
3. The identity provider authenticates the staff member and enforces MFA. A
   phishing-resistant option such as WebAuthn/passkeys must be available; SMS is not an
   acceptable sole second factor for administrators.
4. The backend validates issuer, audience, signature, expiry, nonce, state and PKCE
   binding before accepting the identity result.
5. The backend looks up the stable `(issuer, subject)` pair in the local staff allowlist.
   Email is display/contact data, not a durable identity key and not sufficient for
   authorization.
6. An unknown, disabled or unassigned identity receives no application session. The
   response must not disclose whether a particular staff record exists.
7. After successful authorization, the backend creates a new random opaque session,
   stores only a keyed hash of its identifier, and sends the identifier in the session
   cookie. A login or privilege change always rotates the identifier.

There is no public sign-up path. Initial administrators are provisioned through a
controlled, auditable bootstrap operation after their exact provider identities have
been approved. Routine invitation and deactivation tooling may be added only if Phase 3A
needs it; the bootstrap mechanism must not become a public or permanently enabled route.

## Session policy

The following are implementation defaults and may be tightened during provider review:

| Control             | Required behavior                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Session identifier  | At least 128 bits from a cryptographically secure generator; store only a keyed hash                        |
| Cookie              | `HttpOnly`, `Secure` in production, `SameSite=Lax`, host-only, `Path=/`; use a `__Host-` name in production |
| Idle lifetime       | 30 minutes, enforced server-side                                                                            |
| Absolute lifetime   | 8 hours, enforced server-side regardless of activity                                                        |
| Renewal             | Rotate after login, reauthentication and any role/status change                                             |
| Logout              | Revoke the server session before clearing the cookie; repeated logout is safe                               |
| Deactivation        | Revoke all sessions for the staff identity immediately                                                      |
| Concurrent sessions | Maximum three per staff identity; creating another revokes the oldest                                       |

Session activity is updated at a bounded interval rather than writing on every request.
Expired and revoked sessions are rejected even if the browser still sends a cookie. The
collection uses a TTL index for cleanup, but authorization must check expiry explicitly
because TTL deletion is asynchronous.

No authenticated admin response may be stored by shared caches. Admin pages and API
responses use appropriate `Cache-Control: no-store` behavior and remain excluded from
search indexing.

## CSRF, CORS and browser controls

Cookie authentication requires CSRF protection on every state-changing request. The
backend must require both:

- an exact approved `Origin`; and
- a session-bound unpredictable CSRF token sent in a custom request header.

Safe reads do not mutate state. State-changing routes accept only the documented content
types and never use `GET`. CORS remains pinned to the configured frontend origin with
credentials enabled. CORS, `SameSite` cookies and JSON content types are defense in depth;
none replaces the CSRF token check.

The production frontend and API should be deployed under the same registrable site. If
that cannot be done, cookie behavior and the complete CSRF model require a new review
before implementation.

## Application authorization

Authorization is deny-by-default and enforced by Express middleware plus service-level
resource checks. A frontend route guard improves navigation but is never a security
control.

The first release has this permission matrix:

| Capability                               | Public | Authenticated but unassigned | Disabled staff | `admin` |
| ---------------------------------------- | -----: | ---------------------------: | -------------: | ------: |
| Read published property API              |  Allow |                        Allow |          Allow |   Allow |
| Create a public inquiry                  |  Allow |                        Allow |          Allow |   Allow |
| Read drafts and previews                 |   Deny |                         Deny |           Deny |   Allow |
| Create or edit properties                |   Deny |                         Deny |           Deny |   Allow |
| Publish, unpublish or archive properties |   Deny |                         Deny |           Deny |   Allow |
| Change availability                      |   Deny |                         Deny |           Deny |   Allow |
| Read or update inquiries                 |   Deny |                         Deny |           Deny |   Allow |
| Read security audit events               |   Deny |                         Deny |           Deny |   Allow |

The implementation should express these as named permissions rather than scattered
string comparisons, even though the initial role has all Phase 3A permissions. This
keeps each route explicit and lets a later, approved `agent` role receive a smaller set
without changing the authentication model.

Authentication failure returns `401` without sensitive detail. An authenticated identity
that lacks permission returns `403`. A resource outside the caller's allowed scope may
return `404` when revealing its existence would disclose protected information. These
status codes must use the existing shared error envelope.

## Minimum application records

Only records required by Phase 3A are introduced when implementation begins:

**Staff identity**

- stable provider issuer and subject;
- display name and normalized contact email;
- `admin` role;
- active/disabled status;
- creation, update and last-login timestamps.

**Session**

- keyed hash of the opaque identifier;
- staff identity reference;
- creation, last-activity, absolute-expiry and optional revocation timestamps;
- minimal security metadata needed for investigation, with retention defined before
  production.

**Audit event**

- actor identity, action, entity type and entity ID;
- outcome, timestamp and request correlation ID;
- relevant non-sensitive change metadata.

Audit events never contain provider tokens, cookies, CSRF tokens, passwords, MFA
secrets, inquiry message bodies or complete before/after copies of personal data.

## Abuse handling and recovery

- Apply a dedicated login-start rate limit in addition to the general API limiter.
- Prefer provider-side brute-force protection and lockout; locally rate-limit callback
  failures without creating an account-enumeration signal.
- Revoke sessions after account recovery, factor replacement, suspected compromise or a
  staff status/role change.
- MFA recovery is handled by the selected provider under a documented staff verification
  process. The application must not add security questions or an email-only bypass.
- Record successful login, failed callback validation, logout, session revocation,
  denied admin access, staff status changes and sensitive listing/inquiry actions.
- Security logs use structured event names and correlation IDs. They exclude secrets and
  minimize IP/user-agent retention to what is operationally justified.

## Required tests

Implementation is incomplete until automated tests prove:

- forged, expired, wrong-issuer, wrong-audience and replayed callback results fail;
- state, nonce and PKCE validation cannot be bypassed;
- unknown and disabled provider identities receive no session;
- session identifiers rotate and old identifiers stop working;
- idle, absolute, revoked and malformed sessions return `401`;
- missing, invalid and cross-session CSRF tokens reject every state-changing action;
- disallowed origins fail for authenticated requests;
- every protected endpoint rejects anonymous and unassigned identities;
- every permission/endpoint combination has an explicit allow or deny result;
- public property reads still exclude unpublished records;
- logout and staff deactivation invalidate active sessions;
- logs and error responses do not expose tokens, cookies or personal inquiry content.

The browser acceptance suite must also cover login, timeout messaging, logout, denied
navigation, focus management and keyboard use. Provider-hosted pages need a manual
accessibility review unless the provider supplies adequate evidence for the configured
experience.

## Implementation order

1. Approve the implementation gates below and record the provider decision.
2. Add shared auth/session response shapes and authenticated error conventions.
3. Add the staff identity, session and audit models with indexes and retention rules.
4. Implement and test OIDC login/callback/logout plus server-side session middleware.
5. Implement named permission middleware and the complete authorization test matrix.
6. Add the smallest admin shell and protected session bootstrap needed by Phase 3A.
7. Add property administration one lifecycle capability at a time, followed by inquiry
   management and the audit view.

Authentication and authorization land before any property write or inquiry read route.
Media upload remains a separate Phase 3A slice after its storage provider and upload
threat model are approved.

## Implementation gates

The following inputs are still required before code is written:

- Select an OIDC provider that supports Authorization Code + PKCE, enforced MFA,
  phishing-resistant authenticators, exact redirect URI registration, session/account
  revocation, audit logs and separate development/staging/production tenants or
  equivalent isolation.
- Approve the initial administrator identities through a private channel.
- Confirm production frontend and API origins and the deployment's same-site cookie
  topology.
- Confirm whether the 30-minute idle and 8-hour absolute session lifetimes meet staff
  operations needs.
- Assign ownership for staff invitation, deactivation, recovery approval and security
  event review.
- Validate the existing property and inquiry lifecycle vocabulary before those controls
  are exposed to administrators.

Provider evaluation must also consider Philippine availability, support, breach and
data-handling terms, data residency implications, exportability, pricing at the expected
small staff count, SDK maintenance and a tested account-recovery process. No provider is
approved merely because it offers an easy frontend component.

## Security references

- [IETF RFC 9700: OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700)
- [NIST SP 800-63B: Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
