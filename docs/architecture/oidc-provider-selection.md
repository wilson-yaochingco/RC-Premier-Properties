# OIDC Provider Selection

Status: **Auth0 integration accepted; approved Beta password/TOTP configuration prepared; live acceptance pending**

Decision date: 2026-09-05

## Decision

Use **Auth0 Free** as the managed OpenID Connect identity provider for Phase 3A staff
authentication. The selected plan has no recurring charge and does not require a credit
card to sign up. No Auth0 account, tenant or credential is created by this decision.

Auth0 Free is acceptable for development integration and automated/local testing. Its
current pricing matrix excludes Pro MFA factors, so it is not approved as a durable
production authentication plan. This is not approval to add a paid subscription. Live
development testing may use trial capabilities, but production authentication remains
blocked until the owner explicitly approves an Auth0 plan or another provider/control
that can enforce the required administrator MFA strength.

Auth0 authenticates staff and manages credentials, TOTP enrollment and recovery.
Express continues to own the opaque application session, local staff allowlist,
permissions and application audit trail as defined in
[`authentication-and-authorization.md`](authentication-and-authorization.md). Auth0
roles, Organizations and access-token permissions are not the source of application
authorization.

Use Auth0 Universal Login with a Regular Web Application and Authorization Code + PKCE.
The backend integrates through the standards-based `openid-client` library rather than
Auth0's encrypted-cookie session quickstart. This preserves the accepted MongoDB-backed,
immediately revocable session design and limits provider coupling to OIDC configuration.

The approved 2026-09-13 Beta setup supersedes the development passkey exception with
database/password login + mandatory TOTP, recovery retained, passkeys/WebAuthn off and
public signup disabled. The single Admin is `rcpremierph@gmail.com` (Renzo & Criezel).
The original provider comparison below remains historical evaluation context. The
earlier production phishing-resistant-factor gate remains open; TOTP Beta acceptance
does not establish that gate. See [the manual runbook](../development/auth0-setup.md).

## Evaluation context

The first authenticated users are a small set of invited RC Premier Properties
administrators. There is no public registration, client account or agent account in
Phase 3A. The project has MongoDB Atlas but has not selected AWS, Azure or another
production infrastructure platform.

The production authentication design must support:

- standards-based OIDC Authorization Code + PKCE;
- a technically enforced, phishing-resistant administrator sign-in policy;
- disabled public sign-up and controlled staff provisioning;
- exact callback and logout URL allowlists;
- account disablement and recovery;
- identity and configuration isolation between testing and production;
- authentication audit logs and a path to longer retention;
- a practical cost for a very small staff population.

## Candidates

### Auth0 — selected

Strengths:

- Native OIDC and Authorization Code + PKCE support, including `S256`.
- Universal Login supports phishing-resistant passkeys as a primary authentication
  method on the Free plan; a primary passkey is not automatically an Auth0 MFA event.
- Public sign-up can be disabled at the database-connection level.
- Separate tenants are the documented isolation model for development, staging and
  production.
- Focused identity product with a smaller operational surface than adopting a cloud
  platform solely for authentication.
- A standards-based Node OIDC client can be used without making Auth0 session cookies or
  Auth0 authorization claims part of the application architecture.

Costs and limitations:

- The Auth0 pricing page reviewed on 2026-09-05 lists Free at USD 0/month with no credit
  card required to sign up and up to 25,000 monthly active users.
- Free includes passkeys, Auth0 database connections, basic attack protection, one
  tenant, three tenant administrators and one day of tenant-log retention.
- Free does **not** include Pro MFA factors, separate production/development
  environments, log streaming or standard support. MFA controls may be available for
  trial evaluation but are not a durable Free-plan production entitlement.
- Auth0 requires database connections with passkeys enabled to keep passwords enabled;
  progressive passkey enrollment can be postponed. Passkey availability alone is not
  proof that every administrator used a passkey.
- One custom domain is listed as included, but credit-card verification is required to
  activate it.
- Auth0 is an additional vendor and authentication availability dependency. Pricing and
  limits must be rechecked before production because a free service can change.

### Amazon Cognito — runner-up

Strengths:

- Standards-based authorization code flow with PKCE.
- Cognito Essentials supports authenticator-app/SMS MFA, passwordless login and passkeys.
- The reviewed pricing offers a 10,000-MAU free tier for direct or social sign-ins.
- CloudTrail records Cognito management and authentication activity.
- Separate user pools can isolate environments.

Why it was not selected:

- The project has no selected AWS infrastructure. Cognito would introduce AWS account,
  IAM, CloudTrail and regional operations solely for identity.
- Configuration and incident investigation require broader AWS expertise than this
  small staff authentication surface otherwise needs.
- Its cost advantage at the expected user count does not outweigh that operational
  overhead.

### Microsoft Entra ID — conditional alternative

Strengths:

- Authorization Code + PKCE and OIDC are supported.
- Microsoft Entra supports FIDO2/passkeys, MFA, sign-in logs and audit logs.
- It is a strong choice for workforce access when a business already manages staff in
  Microsoft 365/Entra.

Why it was not selected:

- The project has no verified Microsoft workforce tenant, licensing baseline or staff
  directory requirement.
- External ID pricing is attractive, but Phase 3A users are internal staff rather than a
  consumer/external identity population.
- Selecting Entra now would assume a business identity ecosystem that has not been
  supplied.

If RC Premier Properties confirms that all administrators are already governed through
a Microsoft workforce tenant, revisit this decision before provisioning Auth0. That new
information would materially change Entra's operational-fit score.

## Configuration baseline

Provisioning must use these controls:

- Begin with the single included Free tenant for development. Do not place production
  staff identities or production secrets in it. Before launch, provide production
  isolation without mixing test and production identities. Auth0 Free includes only one
  tenant, so the exact no-cost isolation approach must be validated with Auth0 rather
  than assuming extra tenants are permitted.
- Register the backend as a Regular Web Application/confidential OIDC client.
- Enable only Authorization Code and the grants actually required by the implementation;
  require PKCE with `S256`. Every authorization request includes the standard MFA
  `acr_values` value; the Auth0 MFA API grant is not used.
- Use Universal Login. Do not embed credential collection in the RC Premier frontend.
- Use a dedicated database connection with **Disable Sign Ups** enabled. Do not enable
  social connections or Organizations without a later decision.
- For the approved Beta connection `RC-Premier-Admin`, enable database/password login,
  disable public signup, passkeys and both WebAuthn factors, and require OTP/TOTP MFA
  with policy **Always** and recovery capability. Retire the former development
  passkey-evidence Action; every environment now requires validated `amr: mfa`.
- Register exact callback and logout URLs. Do not use wildcard production URLs.
- Request only `openid profile email`. Do not request provider API access or offline
  access unless a later implementation requirement proves it necessary.
- Treat `(issuer, subject)` as the stable external identity key. Email is not an
  authorization key.
- Disable or delete unused connections and review which applications each connection
  can access.
- Store client secrets only through backend environment configuration and the eventual
  deployment secret store. Never add them to `NEXT_PUBLIC_` variables or Git.

Auth0 tenant configuration is security-sensitive infrastructure. Before production, it
must be reproducible or captured in a reviewed configuration runbook, including passkey
policy, connections, callback URLs, log retention and tenant administrators.

## MFA entitlement and acceptance boundary

The approved Beta flow is password + authenticator TOTP through Universal Login.
Every configured environment requires validated ID-token `amr` containing `mfa`;
there is no Free/development signed-passkey exception. Password-only, skipped MFA,
and passkey-only evidence cannot produce a local application session. Recovery must
remain inside Auth0 and must not create an application email-only bypass.

Before live Beta acceptance, verify the selected tenant/plan supports OTP/TOTP MFA for
the required period, then prove enrollment and password/TOTP challenges on subsequent
logins. The [Auth0 plan matrix](https://auth0.com/pricing), checked on 2026-09-13, lists
Pro MFA Factors as unavailable on Free. No paid plan or trial is enabled by this task;
any required plan change needs owner approval. Do not fall back to passkeys or optional
MFA if that entitlement is absent. Production identity isolation, retention, recovery
and the earlier phishing-resistant-factor requirement remain separate launch gates.

## Application integration

The backend uses ESM-compatible `openid-client` 6.8.7, committed through the root
workspace lockfile. Its boundary performs discovery, constructs Authorization Code +
PKCE requests and validates the returned code grant, ID-token signature, issuer,
audience, expiry, state and nonce.

The integration boundary is deliberately narrow:

```text
Auth0 discovery + authorize + token endpoints
                    |
                    v
Express OIDC callback validation
                    |
                    v
local StaffIdentity allowlist
                    |
                    v
MongoDB-backed opaque application session
```

Provider ID/access/refresh tokens are used only as needed to complete and validate the
login transaction. They are not returned to the frontend or used as the long-lived RC
Premier Properties session. Do not use the Auth0 Express quickstart's encrypted cookie
session because it does not implement the accepted local session model.

Authentication tests do not depend on the live Auth0 service. HTTP tests inject the OIDC
boundary, and protocol tests use a local issuer, generated signing key and JWKS to cover
positive and negative validation paths. Passkey authentication and redirect to the
public root were reported working on 2026-09-06; a manual development-tenant acceptance
pass still has to verify the backend session, exact `/admin` return, protected operations
and logout after the automated security suite passes.

Every authorization request includes
`acr_values=http://schemas.openid.net/pape/policies/2007/06/multi-factor`, while the
tenant-wide policy **Always** remains the intended production enforcement control.
Auth0 documents that a hosted flow adds `mfa` to the ID-token `amr` only after a
successful MFA challenge. Every environment requires `AUTH_REQUIRED_AMR=mfa`;
password and TOTP selection remain Auth0 tenant controls. Durable plan entitlement and
live Beta/production acceptance remain open.

## Cost and operational controls

- Do not enable a paid upgrade, trial, add-on or subscription without explicit owner
  approval. Verify the approved plan supports mandatory TOTP before live Beta login.
- Confirm the USD 0 price, authentication controls, tenant limits, rate limits and log
  retention immediately before production.
- A credit card is not required for Free sign-up. If a custom domain is requested, warn
  the owner that Auth0 currently requires credit-card verification before taking action.
- Retain the application's own security audit events independently of Auth0 logs.
- Free retains provider logs for only one day and does not include log streaming. Define
  an approved long-term authentication-audit approach before production.
- Document how an authorized administrator disables an Auth0 user and the matching local
  staff identity, and verify that local sessions are revoked immediately.
- Document tenant-owner recovery and require MFA for Auth0 Dashboard administrators.

## Remaining acceptance gates

The owner has configured the Auth0 Free development application, disabled signup,
provisioned the first local administrator and completed a passkey redirect. Secrets stay
only in the ignored local environment. Live integration is not accepted until the exact
`/admin` return, backend session cookie, protected property operations, CSRF rejection,
logout and disabled/unknown-staff behavior pass the manual runbook. The proposed
30-minute idle and 8-hour absolute application session limits also require operational
approval.

Production remains blocked until the Free-plan security boundary, production identity
isolation, production domains, log retention and staff recovery ownership are approved.

## Revisit conditions

Re-evaluate the provider if:

- RC Premier confirms an existing governed Microsoft Entra workforce tenant;
- hosting standardizes on AWS and the team accepts Cognito's operational model;
- Auth0 changes required MFA, environment or log capabilities;
- the Free plan no longer meets the project's cost constraint;
- Philippine availability, support or data-handling review rejects Auth0;
- Phase 4 client accounts introduce materially different identity requirements.

## Primary sources reviewed

- [Auth0 Authorization Code Flow with PKCE](https://auth0.com/docs/api/authentication/authorization-code-flow-with-pkce/authorize-with-pkce)
- [Auth0 tenant-wide MFA configuration](https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa)
- [Auth0 MFA step-up and validated `amr`](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication/configure-step-up-authentication-for-web-apps)
- [Auth0 remembered-browser and `acr_values` behavior](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa)
- [Auth0 MFA factors](https://auth0.com/docs/secure/multi-factor-authentication/multi-factor-authentication-factors)
- [Auth0 passkey configuration and limitations](https://auth0.com/docs/authenticate/database-connections/passkeys/configure-passkey-policy)
- [Auth0 application settings](https://auth0.com/docs/get-started/applications/application-settings)
- [Auth0 multiple environments](https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments)
- [Auth0 log retention](https://auth0.com/docs/deploy-monitor/logs/log-data-retention)
- [Auth0 pricing](https://auth0.com/pricing)
- [Amazon Cognito OAuth grants](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html)
- [Amazon Cognito pricing](https://aws.amazon.com/cognito/pricing/)
- [Amazon Cognito CloudTrail logging](https://docs.aws.amazon.com/cognito/latest/developerguide/logging-using-cloudtrail.html)
- [Microsoft authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Entra passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [`openid-client` authorization code grant](https://github.com/panva/openid-client/blob/main/docs/functions/authorizationCodeGrant.md)
