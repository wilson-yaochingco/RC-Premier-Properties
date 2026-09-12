# Deployment topology and trust boundaries

This is the Level 11 deployment architecture for RC Premier Properties. It defines the
safe topology the current Auth0, opaque-session, CSRF, media, and privacy design supports.
It does not select a hosting vendor or invent a public domain.

## Recommended topology

Use one public HTTPS origin with a managed reverse proxy routing the web application and
API to their separate runtimes:

```text
Browser
  |
  | HTTPS: https://<approved-public-origin>
  v
Managed edge / reverse proxy
  |-- / and Next.js assets ----------> Next.js server
  `-- /api/v1/* ---------------------> Express API
                                          |-- MongoDB Atlas
                                          |-- object storage / CDN (unselected)
                                          |-- transactional email (unselected)
                                          |-- Auth0
                                          `-- map tiles are fetched by the browser
                                              from an approved provider (unselected)
```

The frontend and backend remain independently built applications. Sharing a public
origin is an edge-routing choice, not a merge into one process. For this topology,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, backend `CORS_ORIGIN`, and backend
`API_PUBLIC_ORIGIN` use the same approved origin. The Auth0 callback is that origin plus
`/api/v1/auth/callback`.

This is the safest default because it avoids cross-site cookies, keeps the production
`__Host-` cookie host-only, and minimizes CORS and CSP origins. The reverse proxy must not
cache `/api`, `/admin`, authentication, or other personalized responses.

## Supported same-site alternative

Level 22 recommends Vercel for Next.js with Express on a separate persistent Node host
under this same-site alternative (or the recommended single-origin managed edge). The
API's 12 MB upload policy and process-local limiters require more than a Functions
deployment entry point. See [Controlled Vercel beta](../development/vercel-beta.md) for
the exact build/root settings, fixed-preview strategy, and remaining live prerequisites.
No hosting account, DNS, or provider is configured by this repository change.

A frontend host and API host under the same registrable HTTPS site are compatible, for
example a `www` host and an `api` host chosen by the owner. This requires:

- `NEXT_PUBLIC_SITE_URL` and `CORS_ORIGIN` to be the exact frontend origin;
- `NEXT_PUBLIC_API_URL` and `API_PUBLIC_ORIGIN` to be the exact API origin;
- the Auth0 callback to use `API_PUBLIC_ORIGIN` exactly;
- both hosts to be HTTPS and genuinely same-site under browser public-suffix rules;
- credentialed fetches to retain the exact-origin CORS policy; and
- CSP `connect-src` to include only the configured API origin.

The API session cookie remains host-only on the API host. The application does not set a
broad cookie `Domain` and does not switch to `SameSite=None`. A cross-site frontend/API
deployment is unsupported by the hardened session design and must not be made to work by
weakening cookies.

## Session, CORS, CSRF, and Auth0

Production sessions use `__Host-rc_session` and OIDC transactions use
`__Host-rc_oidc_transaction`. Both are `Secure`, `HttpOnly`, `SameSite=Lax`, have
`Path=/`, and omit `Domain`. Auth0 uses Authorization Code with S256 PKCE, state, nonce,
exact callback/return allowlists, and server-side client credentials. Application roles
and permissions continue to come from local `StaffIdentity` records, never Auth0 Roles.

Every authenticated mutation requires all of the following: a valid backend session, the
exact configured `Origin`, and the matching session-bound `X-CSRF-Token`. Credentialed
CORS permits only `CORS_ORIGIN`; wildcard production CORS is rejected at startup.
Production requires Auth0 MFA evidence in `amr: mfa`. A real tenant MFA pass remains an
external launch gate.

## Proxy trust and HTTPS ownership

The edge terminates public TLS and forwards to the application over the hosting
provider's protected internal network. `TRUST_PROXY_HOPS` is the exact number of trusted
proxy layers between the internet and Express. Production requires an explicit value;
zero is valid only for a verified direct TLS connection. Never use `trust proxy = true`.

This count controls Express protocol and client-IP interpretation and therefore affects
secure-cookie behavior, rate limiting, and audit context. It must be confirmed from the
chosen host's routing documentation and staging headers before traffic is enabled.

The frontend and backend emit HSTS in public deployments with one-year `max-age` and no
`includeSubDomains` or preload. The edge must not inject a conflicting policy. HSTS is
effective only after an HTTPS response reaches a browser.

## Security-header ownership

| Layer          | Ownership                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Next.js        | CSP, HSTS for staging/production, nosniff, frame denial, referrer policy, permissions policy, admin no-store/noindex |
| Express/Helmet | API CSP/default Helmet protections, production HSTS, permissions policy, protected-response no-store                 |
| Edge           | TLS termination and preservation of application headers; no broader or conflicting policy                            |

The frontend CSP permits its own assets, the exact API origin, the configured tile
origin, the optional exact media origin, and YouTube privacy-enhanced frames. It forbids
objects and framing, never enables `unsafe-eval`, and uses no wildcard hosts. The current
Next.js hydration and Leaflet behavior require inline script/style compatibility, so
`unsafe-inline` remains narrowly limited to those directives. A future nonce migration
would need runtime request handling and should be evidence-driven.

## Provider decisions

| Category            | Status                     | Integration point and exposure                                                                   | Failure behavior / remaining gate                                                                        |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Application hosting | Unselected                 | Two Node runtimes behind one HTTPS edge are recommended                                          | Owner must select host, domain, proxy count, limits, and timeouts                                        |
| Object storage      | Unselected                 | `PropertyMediaStorage` is the server-side write/delete boundary; no blobs enter MongoDB          | Production upload returns 503 until a real adapter and credentials exist                                 |
| CDN/media delivery  | Unselected                 | One optional exact `MEDIA_PUBLIC_ORIGIN` / `NEXT_PUBLIC_MEDIA_ORIGIN`; Next Image and CSP use it | Public hostname, caching, CORS, and live delivery remain external                                        |
| Transactional email | Unselected                 | `InquiryNotifier` runs only after MongoDB persistence                                            | Disabled adapter sends nothing; real receipt remains external; receiver stays `rcpropertiesss@gmail.com` |
| Map tiles           | Unselected                 | Leaflet consumes a validated public tile template and plain-text/link attribution                | Staging/production build fails without approved configuration; list/text fallback remains usable         |
| Database            | MongoDB Atlas architecture | Server-only encrypted URI with explicit database; readiness follows Mongoose state               | Production cluster, user, network allowlist, and execution-plan evidence remain external                 |
| Authentication      | Auth0                      | Backend-only OIDC client, opaque local session, local authorization                              | Production tenant callbacks, secret, MFA factors, and live flow acceptance remain external               |

No containers are added. Neither selected hosting characteristics nor the existing simple
two-runtime application justify Docker or orchestration at this stage.

## Media and provider lifecycle

Media uploads remain proxied through Express; browser-to-bucket write CORS is not needed.
The application validates file type, dimensions, pixels, count, and the 12 MB per-image
policy before the storage boundary. A future adapter must generate UUID/server-owned,
versioned object keys, retain protected originals separately from public optimized
derivatives, and return stable HTTPS delivery URLs on the configured media origin.

Replacement and removal must delete only objects whose ownership is proven. Archived
property media is retained unless an explicit business retention decision says otherwise.
Orphan scanning, version-retention automation, backup verification, and recovery testing
belong to Level 12. Until a provider is chosen, bucket versioning/lifecycle capabilities
cannot be asserted.

## Data and location privacy

The topology does not change public projections. Public queries remain published,
sales-only inventory. Exact residential addresses and coordinates stay on protected
administration responses, and public maps use only independently approved `publicPoint`
coordinates. CDN caches must contain only approved public derivatives, never private API
responses or original media that has not been approved for delivery.
