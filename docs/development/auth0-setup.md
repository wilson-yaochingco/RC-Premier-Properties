# Auth0 Free Development Setup

Status: development tenant, Regular Web Application, disabled public signup, local
administrator provisioning and a passkey redirect to `http://localhost:3000/` were
reported working on 2026-09-06. Live application-session bootstrap, protected property
operations and logout still require the manual acceptance run below.

This runbook configures invited staff authentication only. Do not enable public signup,
social connections, Auth0 Organizations or Auth0 roles. Local `StaffIdentity` records
remain the source of application authorization.

## 1. Create the development tenant

1. Sign up for Auth0 Free. The Free plan is sufficient for development and currently
   requires no credit card.
2. Create one tenant with a clearly non-production name such as
   `rc-premier-properties-dev` and select the nearest appropriate region available to
   the project owner.
3. Record the tenant **Domain** from **Settings**. If it is
   `rc-premier-properties-dev.us.auth0.com`, the issuer value is
   `https://rc-premier-properties-dev.us.auth0.com/` including the scheme and trailing
   slash.
4. Enable MFA for every Auth0 Dashboard administrator account separately from the
   application-user settings below.

Auth0 Free includes one tenant. Do not mix production staff or production secrets into
this development tenant. Production environment isolation remains unresolved.

## 2. Create the application

1. Open **Applications → Applications → Create Application**.
2. Name it `RC Premier Properties Backend (Development)`.
3. Choose **Regular Web Application**.
4. In application settings, enter these exact local values:

   | Auth0 field           | Value                                        |
   | --------------------- | -------------------------------------------- |
   | Application Login URI | Leave empty for local development            |
   | Allowed Callback URLs | `http://localhost:5000/api/v1/auth/callback` |
   | Allowed Logout URLs   | `http://localhost:3000/`                     |
   | Allowed Web Origins   | `http://localhost:3000`                      |

5. Auth0 requires the Application Login URI to use HTTPS and does not accept localhost
   there. It is optional because RC Premier starts login through its own backend route.
6. Do not add wildcards. Add comma-separated production values only after the real
   production domains are approved.
7. Under **Advanced Settings → Grant Types**, keep **Authorization Code** enabled. The
   application does not use Implicit, Password, Client Credentials or Refresh Token
   grants. PKCE has no separate application secret: the backend generates a new verifier
   and sends `S256` on every authorization request.

The current logout endpoint revokes the RC Premier application session locally. The
Allowed Logout URL above reserves the safe return address for a future reviewed Auth0
SSO-logout addition; the backend does not call it yet.

## 3. Configure Universal Login and Free-plan development passkey assurance

1. Under **Branding → Universal Login**, use the current Universal Login experience and
   disable any Classic/custom login page.
2. Use the Identifier First authentication profile required by Auth0 passkeys.
3. Under **Authentication → Database**, create or select a dedicated connection named
   `rc-premier-staff-dev`.
4. Turn on **Disable Sign Ups**. Verify the connection is enabled only for the RC Premier
   development application.
5. Do not enable social connections or Organizations.
6. In the connection's **Authentication Methods**, enable a database-connection passkey
   and complete the Identifier First prerequisites. The Free development flow requires
   the approved administrator to use this passkey; password-only login is denied.
7. Under **Security → Multi-factor Auth**, leave paid MFA factors disabled and leave the
   policy at **Never** while the tenant remains on Free. Do not enable a paid trial or
   subscription without owner approval.
8. Do not enable the application's **MFA** grant type. That grant is for Auth0's MFA API;
   this application uses the hosted Universal Login Authorization Code flow.

### Add the reviewed passkey-evidence Action

Auth0 exposes actual passkey use to a Post-Login Action. The Action copies only that
boolean result into a namespaced ID-token claim; the signed token remains subject to the
backend's issuer, audience, signature, expiry and nonce validation.

1. Open **Actions → Library → Build Custom**.
2. Name the Action `Add RC Premier passkey assurance` and select the **Login / Post
   Login** trigger.
3. Replace the editor contents with this exact code:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const usedPasskey =
       event.connection?.name === "rc-premier-staff-dev" &&
       event.authentication?.methods?.some((method) => method.name === "passkey") ===
         true;

     api.idToken.setCustomClaim(
       "https://rc-premier-properties.example/claims/passkey",
       usedPasskey,
     );
   };
   ```

4. Select **Deploy**.
5. Open **Actions → Triggers** and select the **post-login** (Login) trigger. Add the
   deployed custom Action to that trigger and select **Apply**. In dashboard versions
   that still label this page as a flow, the equivalent path is **Actions → Flows →
   Login**. Do not use **Actions → Forms**; its visual form-flow builder is unrelated.

Do not change the claim name or set it from user metadata. The Action derives it from
Auth0's authentication event, and the backend accepts it only outside production.

Every backend authorization request still sends the standard Auth0 MFA step-up value
`acr_values=http://schemas.openid.net/pape/policies/2007/06/multi-factor` so the same
request is ready for the intended production MFA policy. The Free development tenant
cannot satisfy that value with a paid MFA challenge, so the backend instead validates
the signed passkey claim described above. The request also sends `prompt=login`, which
requires a fresh Auth0 authentication prompt before a new local session is created.

Auth0's current documentation says a hosted flow adds `mfa` to the ID token's validated
`amr` array only after the user passes an MFA challenge. In production, the backend
requires exactly that evidence. In development and test only, it alternatively accepts
the signed boolean claim above when Auth0 reports that a passkey actually authenticated
the user. Missing evidence and password-only authentication fail closed.

These are two different WebAuthn uses:

- A **database-connection passkey** can be the primary authentication method. It is not
  automatically proof that Auth0 ran an MFA challenge.
- **WebAuthn with FIDO Security Keys** under **Security → Multi-factor Auth** is an Auth0
  MFA factor used after the primary authentication step.

The current Auth0 Free pricing matrix does not include Pro MFA factors. The passkey
exception is deliberately unavailable when `NODE_ENV=production`; it cannot silently
weaken the production requirement. Production remains blocked until an appropriate paid
Auth0 plan, another approved provider/control, or an explicit production-security
decision is selected.

## 4. Configure local secrets

Copy `backend/.env.example` to the ignored `backend/.env`, then fill:

```ini
AUTH0_ISSUER_URL=https://<your-development-domain>/
AUTH0_CLIENT_ID=<Application Settings → Client ID>
AUTH0_CLIENT_SECRET=<Application Settings → Client Secret>
AUTH0_CALLBACK_URL=http://localhost:5000/api/v1/auth/callback
AUTH_ALLOWED_RETURN_URLS=http://localhost:3000/,http://localhost:3000/admin
AUTH_SESSION_HASH_SECRET=<your-own-random-secret>
AUTH_REQUIRED_AMR=mfa
```

Development uses loopback HTTP. In production, configuration validation rejects HTTP
for the frontend origin, callback and return URLs; all three must use exact HTTPS URLs.

`AUTH_SESSION_HASH_SECRET` is separate from the Auth0 client secret. Generate at least
32 random bytes locally. For example, in PowerShell:

```powershell
$authBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($authBytes)
[Convert]::ToBase64String($authBytes)
```

Paste the result only into the ignored `backend/.env`. Never paste either secret into
chat, an issue, a screenshot, source code or a committed file. Production secrets must
eventually live in the deployment secret manager.

## 5. Create and allow the first administrator

1. In Auth0, open **User Management → Users → Create User**.
2. Create the staff user in `rc-premier-staff-dev`; do not expose a signup link.
3. Open the user and copy **user_id**, for example `auth0|...`. This exact value is the
   OIDC subject. It is an identifier, not the password or client secret.
4. With MongoDB reachable and `backend/.env` configured, run from the repository root:

   ```bash
   npm run auth:provision-admin --workspace backend -- --subject "auth0|..." --email "approved-staff@example.com" --name "Approved Staff Name"
   ```

The CLI takes the issuer from `AUTH0_ISSUER_URL`, creates or updates the local allowlist
record and writes a security audit event. It never creates an Auth0 user and is not an
HTTP endpoint.

## 6. Run and test the admin flow locally

Start MongoDB locally (or make sure Atlas allows the current IP), then run these in two
repository-root terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Before starting the backend, confirm the ignored `backend/.env` contains both exact
return destinations:

```ini
AUTH_ALLOWED_RETURN_URLS=http://localhost:3000/,http://localhost:3000/admin
```

Do not add a wildcard or paste the file contents into chat. Restart the backend after
changing this value. Then navigate to:

```text
http://localhost:3000/admin
```

The shell shows **Staff sign in** while unauthenticated. Follow that action, complete
Universal Login with the approved staff user, and choose the enrolled passkey.
Password-only login is intentionally rejected. Auth0 returns through the backend
callback, which should issue an `HttpOnly` local session cookie and redirect exactly to
`http://localhost:3000/admin`; that route then opens the private property list. The
frontend holds the response's CSRF token only in React memory and sends it on create,
edit and logout requests. Do not copy, print or place that token in storage.

See [`testing.md`](testing.md) for the automated/manual boundary,
[`../api/authentication-api.md`](../api/authentication-api.md) for session responses and
[`../api/property-administration-api.md`](../api/property-administration-api.md) for the
protected property contract.

## 7. Manual development-tenant acceptance

The successful passkey authentication and redirect to the public root are evidence that
the Auth0 application, callback and development assurance claim can complete. They do
not by themselves prove that the backend session cookie, `/admin` return URL, protected
property operations or logout work. Perform these remaining checks:

1. Open DevTools **Network**, visit `http://localhost:3000/admin`, select **Staff sign
   in**, and complete the enrolled-passkey login. Confirm the callback redirects to the
   exact `/admin` URL. `GET /api/v1/auth/session` must return `200`, local staff fields,
   named permissions, a CSRF token and both expiry timestamps. DevTools **Application →
   Cookies** must show the application cookie as `HttpOnly` and `SameSite=Lax`; the
   cookie value must not appear in local storage, session storage or response bodies.
2. Confirm the Post-Login Action is deployed in the Login flow. Test password-only login;
   its callback must return generic `401 Authentication failed.` and issue no application
   session. Repeating login with the enrolled passkey must succeed in development.
3. Try an Auth0 user that has no local `StaffIdentity`, then disable the approved local
   record. Both must receive the same generic `401` and no session. Re-run the controlled
   provisioning command to reactivate the approved administrator afterward.
4. Confirm the private property list loads. Create a synthetic draft, verify its response
   remains `publicationStatus: "draft"` and `availability: "available"`, and confirm its
   slug returns `404` from the public `/properties/:slug` route. Edit its title and
   description; confirm publication status and availability do not change.
5. With the session still active, issue a synthetic draft-create request from the browser
   without `X-CSRF-Token` (do not include real listing or personal data). It must return
   the shared `403` envelope and create nothing. The automated suite separately covers
   altered and cross-session tokens. A request from a disallowed origin must likewise
   return `403`.
6. Select **Sign out** in the admin shell. `POST /api/v1/auth/logout` must return `200`,
   clear the cookie, and make the next session/private-list request return `401`; the UI
   must return to the staff sign-in state. A repeated unauthenticated logout is idempotent
   and remains `200` when sent from the approved origin.
7. Temporarily set `AUTH_SESSION_IDLE_MINUTES=1`, restart, log in and wait more than one
   minute without activity. The next session read must return `401`. Absolute expiry
   similarly returns `401` regardless of activity; its minimum configurable unit is one
   hour and the automated suite covers the exact boundary.
8. Inspect `SecurityAuditEvent` records after create and edit. Each successful operation
   must produce exactly one `property.created` or `property.edited` event. Edit events may
   list changed field names, but no property descriptions, request bodies, callback
   codes, provider tokens, cookies, CSRF values, passwords or inquiry messages may be
   present.
9. Insufficient-permission behavior is covered repeatably by an injected test boundary
   without creating a fake production role. A denied protected read or write returns the
   shared `403` envelope. If this is checked manually, alter only a disposable local test
   fixture and restore it immediately; do not invent or persist a production role.

The `/admin` shell and draft-property slice are deliberately narrower than the complete
Phase 3A lifecycle. Publishing, archiving, availability transitions, media and inquiry
administration remain unavailable.

Official configuration references:

- [Enable Multi-Factor Authentication](https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa)
- [Configure step-up authentication for web apps](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication/configure-step-up-authentication-for-web-apps)
- [Customize MFA and remembered-browser behavior](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa)
- [Auth0 plan comparison](https://auth0.com/pricing)
