# Auth0 Admin setup and Beta handoff

Status: **CODE COMPLETE; MANUAL AUTH0 CONFIGURATION REQUIRED.** This runbook does not
prove live password/TOTP authentication, provision a real user, or authorize deployment.
The development passkey redirect reported on 2026-09-06 remains historical evidence;
it is not acceptance of the approved Beta login flow.

## Ownership and single Admin identity

| Responsibility                                                                      | Approved identity       |
| ----------------------------------------------------------------------------------- | ----------------------- |
| Infrastructure owner: Auth0 dashboard/tenant, Vercel, Atlas, API host and providers | `wilsonyao72@gmail.com` |
| Website Admin and business notification mailbox                                     | `rcpremierph@gmail.com` |
| Website Admin display name                                                          | `Renzo & Criezel`       |

There is intentionally one shared operational Admin for Renzo & Criezel. Do not create
separate accounts for them or provision the infrastructure owner as website Admin.
Application audit events identify this one local `StaffIdentity`; they cannot attribute
an action to one of the two people individually. The shell caption remains **Signed in
as Renzo & Criezel** and is presentation, not proof of identity or authorization.

Auth0 owns passwords, TOTP enrollment and recovery. Express retains the exact local
`(issuer, subject)` allowlist, roles, permissions, revocable opaque sessions, audit,
CSRF and origin protections. A matching email, including the business email, does not
authorize a login. No Auth0 roles, Organizations, social connections, customer accounts
or custom RC Premier credential forms are needed.

## 1. Confirm the tenant and MFA entitlement

Use an isolated Beta/staging Auth0 tenant/application and keep its users/secrets separate
from production. Sign into the dashboard using the infrastructure owner's account;
secure dashboard access with its own MFA, separately from website-user MFA.

Verify the selected plan supports authenticator OTP/TOTP MFA for the duration of Beta.
Auth0's [plan matrix](https://auth0.com/pricing), checked on 2026-09-13, lists Pro MFA
Factors as unavailable on Free. A development passkey or temporary trial does not prove
durable TOTP entitlement. The owner must approve any required plan change; this task
does not enable a trial, subscription or alternate authentication method. If TOTP is
unavailable, live Admin acceptance is blocked; retain fail-closed MFA.

Record the tenant domain as `https://<beta-auth0-domain>/`, with a trailing slash.
Do not guess the real domain or final Beta origins.

## 2. Configure the Regular Web Application

Under **Applications → Applications**, create/verify the Beta backend as a **Regular
Web Application**. Use current **Branding → Universal Login**, with Classic/custom
login disabled. Standard Login and Identifier First can collect email/password; there
is no longer a passkey-specific profile dependency.

Keep **Authorization Code** enabled under **Advanced Settings → Grant Types**.
The flow uses server-side Authorization Code + S256 PKCE with scopes
`openid profile email`. Do not enable Implicit, Password/ROPG, Client Credentials,
Refresh Token or the MFA API grant for this flow. Password authentication in Universal
Login does not require the Password grant. No browser Auth0 client secret or new API
audience is required: the validated ID-token audience is `AUTH0_CLIENT_ID`.

After the real Beta origins exist, enter exact URLs:

| Auth0/application field                              | Beta value (replace placeholders)                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Allowed Callback URLs / backend `AUTH0_CALLBACK_URL` | `<BETA_API_ORIGIN>` + `API_PREFIX` + `/auth/callback` (currently `/api/v1/auth/callback`) |
| Allowed Logout URLs                                  | `<BETA_FRONTEND_ORIGIN>/`                                                                 |
| Allowed Web Origins                                  | `<BETA_FRONTEND_ORIGIN>`                                                                  |
| Frontend origin / backend `CORS_ORIGIN`              | `<BETA_FRONTEND_ORIGIN>`                                                                  |
| Backend `AUTH_ALLOWED_RETURN_URLS`                   | `<BETA_FRONTEND_ORIGIN>/,<BETA_FRONTEND_ORIGIN>/admin`                                    |
| Backend `API_PUBLIC_ORIGIN`                          | `<BETA_API_ORIGIN>`                                                                       |
| Application Login URI                                | Optional; leave empty unless an approved HTTPS start-login URI is configured              |

Each origin is one exact HTTPS scheme/host/port without a path or trailing slash.
Callbacks run on Express, not a frontend `/callback`. Never allow `*.vercel.app` or
arbitrary PR origins. Preserve the same-site or single-origin topology in
[`vercel-beta.md`](vercel-beta.md). RC Premier logout revokes its local session and
clears cookies; it does not call Auth0 SSO logout. Allowed Logout URLs reserve the safe
address and do not imply otherwise.

For a separately configured local development application, the callback is
`http://localhost:5000/api/v1/auth/callback`, logout is `http://localhost:3000/`,
and web origin is `http://localhost:3000`. Local acceptance also requires TOTP MFA;
there is no development passkey assurance exception.

## 3. Configure the dedicated Admin database connection

Under **Authentication → Database**, create/verify `RC-Premier-Admin` using Auth0's
user store. The connection name is a dashboard choice, not a runtime email allowlist.
Enable it only for the intended RC Premier Beta application and disable that
application's other connections offering social, passwordless or unrelated staff login.

1. Enable **Disable Sign Ups**; verify Universal Login has no public signup option and
   public signup endpoints reject registration.
2. Use email as the identifier and enable **Password** authentication on login. Do not
   configure email OTP/passwordless login as a substitute for the password.
3. Under **Authentication Methods → Passkey → Configure**, turn **Enable passkeys**
   off and save. Verify progressive/local enrollment does not offer passkeys.
4. Retain Auth0 password reset/recovery. The owner manually creates/sets a separate
   Auth0 password. It is **not the Gmail password**. Never request/store the Gmail
   password or place any website password in source, env, commands or chat.
5. Remove the former development passkey-evidence Action from this application's Login
   trigger during manual migration. Do not fabricate `amr: mfa` through a custom
   claim; the backend no longer consumes passkey assurance.

The application redirects to Universal Login and has no owned passkey/WebAuthn UI.
Connection and factor controls belong in Auth0, not frontend hiding or CSS.

## 4. Require authenticator TOTP MFA and retain recovery

Under **Security → Multi-factor Auth**:

1. Enable **One-time Password (OTP)** as the independent MFA factor. This is
   authenticator-app TOTP, compatible with Google Authenticator, not email OTP login.
2. Disable **WebAuthn with FIDO Biometrics** and **WebAuthn with FIDO Security Keys**.
   Keep other ordinary factors (email, SMS, push, Duo) disabled for the approved flow.
3. Retain **Recovery Code** capability and set MFA policy to **Always**, not Never or
   risk-only Adaptive MFA. A dedicated Beta tenant limits the policy's scope.
4. Save settings and review Login Actions for MFA skips/bypasses. Do not allow
   remembered-browser behavior to omit the challenge on new RC Premier logins.

RC Premier already sends `prompt=login` and multi-factor `acr_values` on every new
login. Auth0 documents that the latter overrides remembered-browser skipping. Verify
the challenge on repeat sign-ins. If tenant customization needs an Action to control
remembering, use Auth0's documented `allowRememberBrowser: false` approach scoped to
the intended application/connection, without constructing authentication claims or
authorizing by email.

The backend requires validated ID-token `amr` containing `mfa` in every environment;
missing/empty evidence, password-only and passkey-only authentication fail closed.
This proves Auth0 reported MFA. The exact TOTP factor and password requirement remain
tenant controls and need live acceptance. TOTP is the explicitly approved Beta factor;
it does not establish the earlier production phishing-resistant-factor acceptance gate
or complete a roadmap phase.

## 5. Manually create and map the single Admin

1. Under **User Management → Users → Create User**, create only
   `rcpremierph@gmail.com` in `RC-Premier-Admin`, with name `Renzo & Criezel`.
   The owner sets the Auth0 password privately or uses Auth0's supported reset flow.
   Do not supply it to Codex or add separate Renzo, Criezel or Wilson users.
2. Copy that user's exact **user_id** (`auth0|...`) and Beta issuer. A different
   connection can produce a different subject even when the email matches.
3. After separately authorized Beta database setup, run the existing audited local
   provisioning CLI from the repository root against that isolated environment:

   ```bash
   npm run auth:provision-admin --workspace backend -- --issuer "https://<beta-auth0-domain>/" --subject "auth0|<actual-user-id>" --email "rcpremierph@gmail.com" --name "Renzo & Criezel"
   ```

   The CLI requires an issuer matching `AUTH0_ISSUER_URL`; it maps only the exact
   issuer/subject, creates or updates local Admin authorization, revokes existing
   sessions on updates and writes audit events. It never creates an Auth0 user or
   handles a password. This command has **not** been run in this task.

4. Review existing local staff identities in the protected Staff view. If a former
   operational identity remains active, disable that exact old issuer/subject using
   the existing `auth:disable-staff` CLI; retain its audit history. Do not infer
   subjects from email or automatically alter real records.

See [`authentication-operations.md`](authentication-operations.md) for disablement,
session revocation and controlled factor recovery. Configure the six required backend
Auth0/session values in the host's secret/config store using `backend/.env.example`;
keep `AUTH_REQUIRED_AMR=mfa`. No passwords or MFA seeds belong in env. No secret
may use `NEXT_PUBLIC_`.

## 6. Enroll and accept the login flow

1. Open `/admin`, choose **Staff sign in**, and enter `rcpremierph@gmail.com` plus
   its Auth0 password in Universal Login.
2. On first sign-in, Auth0 must require MFA enrollment. Scan its QR code in Google
   Authenticator and enter the generated TOTP code to confirm enrollment.
3. Store recovery information privately in the owner's approved secure store. Never
   put the QR, seed, recovery codes, password or client secret in the repo, screenshots,
   logs, chat, issues or build artifacts. RC Premier generates none of this material.
4. Verify the callback returns exactly to `/admin`, creates the hosted Beta host-only
   HttpOnly/Secure/SameSite=Lax cookie, and `/auth/session` reports the locally mapped
   Admin. Confirm **Signed in as Renzo & Criezel**.
5. Sign out and sign in again: require email → password → TOTP → Admin Dashboard.
   Wrong/skipped TOTP, password-only and passkey-only attempts must create no session.
   No passkey, biometric/security-key or public signup option should be offered.
6. Verify an authenticated but unmapped Auth0 user remains unauthorized. Automated
   fixtures cover matching-email/different-subject rejection. Unknown/disabled/unassigned
   staff receive generic `401 Authentication failed.`; missing permission is `403`.
7. Verify protected property/inquiry operations, hostile-origin rejection, missing or
   invalid CSRF rejection, no-store/noindex, rotation/expiry and local logout through
   the real edge using synthetic data. Confirm safe audit actor IDs and no credential
   or customer-message logging. Record observed live evidence only.

Official references checked for this handoff:

- [Database connections](https://auth0.com/docs/authenticate/database-connections)
- [Passkey settings](https://auth0.com/docs/authenticate/database-connections/passkeys/configure-passkey-policy)
- [Enable MFA](https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa)
- [Configure authenticator OTP](https://auth0.com/docs/secure/multi-factor-authentication/multi-factor-authentication-factors/configure-otp-notifications-for-mfa)
- [Recovery codes](https://auth0.com/docs/secure/multi-factor-authentication/configure-recovery-codes-for-mfa)
- [MFA remembering controls](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa)
- [Web-app step-up and validated MFA evidence](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication/configure-step-up-authentication-for-web-apps)
