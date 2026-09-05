# Auth0 Free Development Setup

Status: application integration implemented; a real development tenant and manual
acceptance run are still required.

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
   | Application Login URI | `http://localhost:5000/api/v1/auth/login`    |
   | Allowed Callback URLs | `http://localhost:5000/api/v1/auth/callback` |
   | Allowed Logout URLs   | `http://localhost:3000/`                     |
   | Allowed Web Origins   | `http://localhost:3000`                      |

5. Do not add wildcards. Add comma-separated production values only after the real
   production domains are approved.
6. Under **Advanced Settings → Grant Types**, keep **Authorization Code** enabled. The
   application does not use Implicit, Password, Client Credentials or Refresh Token
   grants. PKCE has no separate application secret: the backend generates a new verifier
   and sends `S256` on every authorization request.

The current logout endpoint revokes the RC Premier application session locally. The
Allowed Logout URL above reserves the safe return address for a future reviewed Auth0
SSO-logout addition; the backend does not call it yet.

## 3. Configure Universal Login, the staff connection and required MFA

1. Under **Branding → Universal Login**, use the current Universal Login experience and
   disable any Classic/custom login page.
2. Use the Identifier First authentication profile required by Auth0 passkeys.
3. Under **Authentication → Database**, create or select a dedicated connection named
   `rc-premier-staff-dev`.
4. Turn on **Disable Sign Ups**. Verify the connection is enabled only for the RC Premier
   development application.
5. Do not enable social connections or Organizations.
6. In the connection's **Authentication Methods**, you may enable a database-connection
   passkey as a convenient phishing-resistant **primary login method**. This passkey is
   not the MFA factor and does not by itself satisfy the backend's `amr: mfa` gate.
7. Go to **Security → Multi-factor Auth**. Under **Factors**, enable and configure at
   least one independent factor. For the accepted phishing-resistant production policy,
   use **WebAuthn with FIDO Security Keys**. Auth0 lists OTP, Guardian push, phone, Duo
   and WebAuthn security keys as independent factors; WebAuthn biometrics and email are
   dependent factors and cannot be the only configured factor.
8. Under **Define policies → Require Multi-factor Auth**, select **Always**, then click
   **Save**. Do not select **Never** or risk-based/Adaptive MFA: every administrator
   login must complete MFA.
9. Leave **Customize MFA Factors using Actions** off for this baseline and do not deploy
   a post-login Action that changes MFA behavior. Auth0 documents that Action MFA logic
   takes precedence over the dashboard policy. A future Action requires a separate
   security review.
10. Do not enable the application's **MFA** grant type. That grant is for Auth0's MFA API;
    this application uses the hosted Universal Login Authorization Code flow.

Every backend authorization request also sends the standard Auth0 MFA step-up value
`acr_values=http://schemas.openid.net/pape/policies/2007/06/multi-factor`. This forces a
new MFA requirement even if an Auth0 "remember this browser" state exists. Tenant policy
**Always** is the primary enforcement control; the request parameter is defense in depth.

Auth0's current documentation says a hosted flow adds `mfa` to the ID token's validated
`amr` array only after the user passes an MFA challenge. The backend requires exactly
that evidence. Missing `amr`, an empty array, password-only evidence, and passkey-only
evidence all fail closed with no application session.

These are two different WebAuthn uses:

- A **database-connection passkey** can be the primary authentication method. It is not
  automatically proof that Auth0 ran an MFA challenge.
- **WebAuthn with FIDO Security Keys** under **Security → Multi-factor Auth** is an Auth0
  MFA factor used after the primary authentication step.

The current Auth0 Free pricing matrix does not include Pro MFA factors. A new tenant may
permit MFA evaluation during its trial, but Free must not be treated as durable
production MFA. If the tenant cannot select **Always**, cannot enable a suitable factor,
or does not return validated `amr: ["mfa"]`, the backend will deny login. Do not change
`AUTH_REQUIRED_AMR`, add a custom claim or weaken the check; production remains blocked
until an appropriate paid Auth0 plan or another approved provider/control is selected.

## 4. Configure local secrets

Copy `backend/.env.example` to the ignored `backend/.env`, then fill:

```ini
AUTH0_ISSUER_URL=https://<your-development-domain>/
AUTH0_CLIENT_ID=<Application Settings → Client ID>
AUTH0_CLIENT_SECRET=<Application Settings → Client Secret>
AUTH0_CALLBACK_URL=http://localhost:5000/api/v1/auth/callback
AUTH_ALLOWED_RETURN_URLS=http://localhost:3000/
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

## 6. Run and test locally

Start MongoDB locally (or make sure Atlas allows the current IP), then run these in two
repository-root terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Navigate to this URL in the same browser used for the frontend:

```text
http://localhost:5000/api/v1/auth/login?returnTo=http%3A%2F%2Flocalhost%3A3000%2F
```

Complete Universal Login with the approved staff user. Use the configured primary login
method, then complete the separate Auth0 MFA-factor challenge. The browser should return
to `http://localhost:3000/` with an `HttpOnly` local session cookie. Use the browser
console on that page to inspect the non-secret session response:

```js
const session = await fetch("http://localhost:5000/api/v1/auth/session", {
  credentials: "include",
}).then(async (response) => ({ status: response.status, body: await response.json() }));
console.log(session);
```

For logout, use the returned CSRF value without printing or sharing it:

```js
await fetch("http://localhost:5000/api/v1/auth/logout", {
  method: "POST",
  credentials: "include",
  headers: { "X-CSRF-Token": session.body.csrfToken },
});
```

See [`testing.md`](testing.md) for the automated/manual boundary and
[`../api/authentication-api.md`](../api/authentication-api.md) for exact responses.

## 7. Manual development-tenant acceptance

Perform this once the tenant and administrator are provisioned:

1. Confirm a primary login followed by the configured MFA factor returns to the exact
   frontend URL and `GET /auth/session` returns `200`, local staff fields, named
   permissions, a CSRF token and both expiry timestamps. DevTools must show an `HttpOnly`,
   `SameSite=Lax` session cookie; it must not appear in browser storage or the response
   body.
2. Inspect the Auth0 tenant log for that transaction and verify a separate MFA challenge
   completed. Test password-only and primary-passkey-only paths without completing the
   MFA factor. Each callback must return generic `401 Authentication failed.` and issue
   no application session. A primary passkey alone is not a passing result.
3. Try an Auth0 user that has no local `StaffIdentity`, then disable the approved local
   record. Both must receive the same generic `401` and no session. Re-run the controlled
   provisioning command to reactivate the approved administrator afterward.
4. Call `POST /auth/logout` while authenticated with no CSRF header, an altered token and
   `Origin: https://attacker.invalid`. Each must return the shared `403` envelope and keep
   the session active.
5. Log out with the exact origin and current session CSRF token. It must return `200`,
   clear the cookie and make the old cookie return `401`. Repeating logout from the
   approved origin must still return `200`.
6. Temporarily set `AUTH_SESSION_IDLE_MINUTES=1`, restart, log in and wait more than one
   minute without activity. The next session read must return `401`. Absolute expiry
   similarly returns `401` regardless of activity; its minimum configurable unit is one
   hour and the automated suite covers the exact boundary.
7. Inspect application logs and `SecurityAuditEvent` records. They may contain request
   IDs and predefined reasons, but must not contain callback codes, provider tokens,
   cookies, CSRF values, passwords or inquiry message bodies.

There is no permission-protected business endpoint or admin UI in this foundation, so a
manual insufficient-permission `403` and denied admin navigation are not yet possible.
The automated middleware test covers `403`; repeat it manually when the first protected
Phase 3A capability is introduced.

Official configuration references:

- [Enable Multi-Factor Authentication](https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa)
- [Configure step-up authentication for web apps](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication/configure-step-up-authentication-for-web-apps)
- [Customize MFA and remembered-browser behavior](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa)
- [Auth0 plan comparison](https://auth0.com/pricing)
