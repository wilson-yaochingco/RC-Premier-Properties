# Controlled Vercel beta

Level 22 prepares repository engineering for hosted acceptance. No deployment, provider
provisioning, DNS change, production data mutation, or credential rotation is authorized
by this runbook. Deployment requires a separate owner instruction. Use an isolated beta
database and invited staff; do not upload customer data or approved production inventory
until the relevant owners approve it.

## Architecture and prerequisites

Use **Next.js on Vercel and Express on a separately hosted, persistent Node runtime**.
Use a fixed HTTPS beta frontend origin and a fixed HTTPS API origin under the same
owner-controlled registrable site, or the existing single-origin managed-edge topology.
Do not use an unrelated `vercel.app` frontend and third-party API domain for authenticated
staff testing: the existing host-only `SameSite=Lax` cookies require a same-site topology.
Do not change cookies to `SameSite=None`, add a broad cookie Domain, accept arbitrary
preview hosts, or trust every forwarded header.

The owner must supply the fixed beta origins, Vercel project access, a suitable API host,
verified proxy depth, isolated Atlas database/user/network access, an Auth0 beta
application with MFA, approved tile configuration, and an acceptance owner before a full
hosted beta can start. Storage and email adapters are deliberately unconfigured; provider
selection, adapter integration, credentials, and live acceptance remain separate gates.

Vercel supports Express listeners and default-exported applications, so `listen()` alone
is not the incompatibility. The current API uses in-process rate-limit stores, a 12 MB
image-upload policy, persistent-process connection/start/shutdown behavior, and separate
operator CLI jobs. Vercel Functions have a documented 4.5 MB request/response payload
limit. Moving this API to Functions would need a deployment entry point, connection
lifecycle proof, a shared limiter strategy, an approved upload strategy, and an external
scheduler. Keeping Express separately avoids a hosting-driven backend rewrite.
See [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) and
[Function limits](https://vercel.com/docs/functions/limitations).

The separate API host must support the raw 12 MB image request policy, bounded image
processing, normal Node networking, SIGTERM/graceful shutdown, and private environment
values. Its edge must prevent direct access that bypasses trusted proxies. For an initial
single API process, existing memory-backed limits are useful; horizontally scaled
deployments need an approved shared limit or equivalent edge enforcement before opening
public intake. Do not infer the correct proxy hop count from a vendor name.

## Vercel project settings

| Setting                      | Value or requirement                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Project                      | Dedicated controlled-beta frontend project                                                                   |
| Framework                    | Next.js; keep framework-managed deployment                                                                   |
| Root Directory               | `frontend`                                                                                                   |
| Files outside Root Directory | Enable inclusion of repository-root scripts, lockfile, and `shared` workspace                                |
| Install Command              | `cd .. && npm ci`                                                                                            |
| Build Command                | `cd .. && npm run build:deployment`                                                                          |
| Output                       | Next.js default `.next`; no static export or custom output override                                          |
| Runtime                      | Node 22, matching CI; local Level 22 checks used Node 24.19.0                                                |
| Public hostname              | Fixed approved beta origin on the owner-controlled site                                                      |
| Protection                   | Restrict preview/beta access using available platform/edge controls; test Auth0 redirects through protection |

The build command compiles shared, then backend, then the frontend under strict public
configuration. Backend compilation does **not** deploy Express or read its live secrets.
Run all npm commands from the repository root. Never install separately inside a workspace
or create another lockfile. Vercel runs its managed Next.js runtime; do not configure the
custom `frontend-deployment-start.mjs` server as a Vercel start command.
Vercel's [monorepo guidance](https://vercel.com/docs/monorepos/monorepo-faq) documents
including files outside the selected root. Confirm settings against the first hosted
build log; local builds cannot prove the hosted project settings.

For the API host, install with `npm ci`, build with `npm run build --workspace shared`
then `npm run build --workspace backend`, and start with `npm run start --workspace backend`.
Retain root/shared/runtime files required by the workspace; do not package only source TS.

## Environment matrix

Set frontend public variables at **build time**. Changing them requires rebuilding; a
runtime-only change cannot repair values already embedded in browser bundles. Production
and Preview settings are independent. A dedicated beta project must use `staging` even
if its Vercel deployment target is named Production. Hosted Vercel builds reject missing,
development, or test deployment mode; `VERCEL_ENV=preview` requires `staging`. Local/CI
artifact builds may still use `test`. Vercel supplies `VERCEL`/`VERCEL_ENV`; these are
server-side platform signals, not browser secrets or application credentials.
See [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables).

| Variable                           | Exposure                                       | Development / test                         | Preview / beta                                                 | Production                               |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_DEPLOYMENT_ENV`       | Public, required hosted                        | `development` / `test`                     | `staging`                                                      | `production`                             |
| `NEXT_PUBLIC_SITE_URL`             | Public, required hosted                        | Local or isolated test origin              | Fixed beta HTTPS frontend origin                               | Approved final HTTPS frontend origin     |
| `NEXT_PUBLIC_API_URL`              | Public, required hosted                        | Local or isolated test API                 | Fixed same-site HTTPS API origin                               | Approved same-site HTTPS API origin      |
| `NEXT_PUBLIC_MAP_TILE_URL`         | Public, required hosted                        | Evaluation / fixture template              | Approved HTTPS template with `{z}`, `{x}`, `{y}`               | Approved production template             |
| `NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT` | Public, required hosted                        | Evaluation / fixture text                  | Approved plain text                                            | Approved plain text                      |
| `NEXT_PUBLIC_MAP_ATTRIBUTION_URL`  | Public, required hosted                        | Evaluation / fixture link                  | Approved HTTPS attribution link                                | Approved HTTPS attribution link          |
| `NEXT_PUBLIC_MEDIA_ORIGIN`         | Public, optional until media supplied          | Optional                                   | One exact approved HTTPS delivery origin                       | One exact approved HTTPS delivery origin |
| API `NODE_ENV`                     | Server config, required hosted                 | `development` / `test`                     | `production`                                                   | `production`                             |
| `PORT`                             | Server config, optional                        | Default 5000                               | API host's port                                                | API host's port                          |
| `CORS_ORIGIN`                      | Server config, required hosted                 | Exact local/test frontend                  | Exactly `NEXT_PUBLIC_SITE_URL`                                 | Exactly final frontend origin            |
| `API_PUBLIC_ORIGIN`                | Server config, required hosted                 | Optional local API                         | Exactly `NEXT_PUBLIC_API_URL`                                  | Exactly final API origin                 |
| `TRUST_PROXY_HOPS`                 | Server config, required hosted                 | Default 0                                  | Explicit verified count                                        | Explicit verified count                  |
| `MONGODB_URI`                      | Server secret, required                        | Local/test-scoped database                 | Isolated TLS Atlas database/user                               | Separate TLS production database/user    |
| `AUTH0_ISSUER_URL`                 | Server config, auth group required hosted      | Optional complete mocked/development group | Exact HTTPS beta tenant issuer                                 | Exact production issuer                  |
| `AUTH0_CLIENT_ID`                  | Server config, auth group required hosted      | As above                                   | Beta confidential application ID                               | Production application ID                |
| `AUTH0_CLIENT_SECRET`              | Server secret, required hosted                 | As above                                   | Beta application secret                                        | Separate production secret               |
| `AUTH0_CALLBACK_URL`               | Server config, required hosted                 | As above                                   | API origin + `API_PREFIX` + `/auth/callback`                   | Same contract on final API               |
| `AUTH_ALLOWED_RETURN_URLS`         | Server config, required hosted                 | As above                                   | Exact approved frontend destinations including `/admin`        | Exact final destinations                 |
| `AUTH_SESSION_HASH_SECRET`         | Server secret, required hosted                 | Test/development-only value                | Unique cryptographically random secret, at least 32 characters | Separate production secret               |
| `AUTH_REQUIRED_AMR`                | Server policy, default `mfa`                   | Test/development policy                    | `mfa`                                                          | `mfa`                                    |
| `AUTH_SESSION_IDLE_MINUTES`        | Server policy, optional                        | Default 30                                 | At most 30                                                     | At most 30                               |
| `AUTH_SESSION_ABSOLUTE_HOURS`      | Server policy, optional                        | Default 8                                  | At most 8                                                      | At most 8                                |
| `AUTH_MAX_CONCURRENT_SESSIONS`     | Server policy, optional                        | Default 3                                  | At most 3                                                      | At most 3                                |
| `AUTH_TRANSACTION_MINUTES`         | Server policy, optional                        | Default 10                                 | At most 10                                                     | At most 10                               |
| `LOG_LEVEL`                        | Server config, optional                        | `debug` development / `warn` test          | `info`, `warn`, or `error`; no `debug`                         | Same                                     |
| `APP_BUILD_ID`                     | Server config, optional public health identity | Optional                                   | Non-secret commit/deployment ID                                | Non-secret commit/deployment ID          |
| `SHUTDOWN_GRACE_SECONDS`           | Server config, optional                        | Default 30                                 | Host-compatible value, at most 120                             | Same                                     |
| `MEDIA_PUBLIC_ORIGIN`              | Server config, optional until media supplied   | Optional                                   | Same exact origin as frontend media                            | Same exact origin as frontend media      |

There are no speculative storage/email credential variables. Define server-only validated
variables with the selected real adapters. No secret may use `NEXT_PUBLIC_`. Real env
files, local sources, logs, traces, and build caches remain ignored and must be excluded
from deployment packaging. Never commit or print credential values.

## Authentication and origins

Keep one fixed approved frontend origin per API environment. Dynamic PR URLs are not
automatically authorized. Use the fixed beta hostname, a separate isolated environment
for a specifically approved preview, or defer protected testing on that preview. Never
allow `*.vercel.app`, wildcard credentialed CORS, or a user-controlled return URL.

Auth0 owner actions: create/select the isolated Regular Web Application; allow the exact
callback on the API host; set the exact beta frontend `/admin` return and approved logout
destinations; set the exact beta Allowed Web Origin where tenant settings require it;
require MFA evidence; provision only explicitly approved local staff using the existing
controlled tool. This application uses server-side Authorization Code + PKCE, not a
browser bearer-token API, so no new API audience is required. Logout revokes the local
application session and clears host-only cookies; it does not promise Auth0 SSO logout.
Production-mode beta rejects the development passkey-only exception.

Live checks must prove state/nonce/PKCE rejection, MFA, secure `__Host-` HttpOnly/Lax
cookies with Path `/` and no Domain, login/session expiry/rotation, staff disablement,
permission rejection, exact-origin CORS/preflight, missing/invalid/cross-session CSRF,
local logout, and protected-response no-store/noindex through the real edge.

## Atlas, media, email, maps

Atlas owner: create an isolated beta database and least-privileged database user; require
TLS and valid certificates; allow only the API host's actual outbound IPs or supported
private networking. Prefer an API host with stable egress. Do not make permanent
`0.0.0.0/0` access the default: it exposes the cluster network surface to the internet
and requires an explicitly reviewed alternative if narrower networking is unavailable.
Deploy/inspect indexes before intake; verify unique property IDs/slugs/idempotency keys,
representative query plans, timeouts, reconnection, and readiness. The API connects once
before listening, uses the process pool, has 5-second server selection and 10-second
database/socket bounds, and refuses non-development startup on connection failure.

Storage owner: choose durable object storage/CDN and implement the reviewed adapter.
Production uploads currently return 503, including beta's production-mode API. Vercel
disk is not listing storage. Test owned-object deletion, gallery/version conflicts,
compensation/cleanup debt, recovery, caching, and metadata stripping on the actual
pipeline. The local WebP transform omits metadata by default; originals remain private
local development sources. This does not prove any future production provider strips
EXIF/GPS metadata. Real listing photographs and public points require approval.

Email owner: select/integrate a transactional provider, verified sender, SPF/DKIM/DMARC
where applicable, provider idempotency, and a bounded external retry job. Verify actual
receipt and failure/retry behavior with approved test identities. Current success means
MongoDB inquiry receipt and staff follow-up, never delivered email or a confirmed tour.
Monitor retry-pending/terminal failures; do not run the disabled retry command against
real records or fabricate provider success.

Map owner: supply a licensed/domain-authorized tile template and attribution; restrict
any browser-visible provider token by domain and scope. Test CSP, quota/error fallback,
boundary loading, mobile List-first behavior, and the separately approved public points.
No private coordinates are substituted when public points are missing.

## Smoke, monitoring, rollback, and owner gates

After separately authorized deployment, verify frontend `/`, `/properties`, a supplied
published property URL, `/locations`, a supplied location URL, `/contact`, `/sell`,
`/book-viewing`, `/admin`, `/robots.txt`, `/sitemap.xml`, and `/sitemaps/0.xml`. Beta must
emit noindex/nofollow/noarchive, disallow crawling, and omit sitemap inventory. Indexing
controls do not provide access control; retain beta access restrictions.

Check API origin + `API_PREFIX` + `/health` (liveness 200) and `/health/ready` (200 only
when MongoDB is connected, otherwise 503). Both are no-store and omit secrets/URIs.
Run `npm run smoke:deployment` from the root with `SMOKE_FRONTEND_ORIGIN` and
`SMOKE_API_ORIGIN` set to the exact approved HTTPS beta origins. These are optional
operator-only, non-secret inputs, not frontend build variables. The command performs
read-only unauthenticated checks; never assume a healthy database proves Auth0 or email
works. Do not point it at any live environment before deployment/testing is authorized.

During beta monitor frontend exceptions, API status/latency/429s, login denials and
session revocations, database disconnections/readiness, inquiry/viewing intake failures,
audit failures, cleanup debt, mail failures, and map/image failures. Shared SSR egress
can share the API IP quota; measure modest real beta traffic before choosing scaling or
limiter changes. Assign an alert recipient and incident owner; do not enable request-body,
token, cookie, message, address, or session-replay capture. No monitoring vendor is added.

Rollback owner: retain immutable frontend/API artifacts from the same tested commit and
their environment/config inventory in the secret store. Revert both runtimes to a known
compatible version, preserve the beta noindex policy and origins, recheck readiness and
core smoke paths, and record the rehearsal. Application rollback does not restore or
erase inquiry/property/audit data. No schema migration is introduced by Level 22.

Atlas backups/PITR and a restore into an isolated database remain unverified. Define RPO,
RTO, media/version recovery, backup alerts, and ownership with the selected providers;
perform the [restore rehearsal](disaster-recovery.md) before claiming completion. Approved
privacy notice/link, lawful intake/retention/purge decisions, verified business content,
real inventory/media, physical devices/assistive technology, field Core Web Vitals, and
final-domain SEO/social crawlers remain owner acceptance work. Current consent controls
can receive a reviewed policy link; no approved policy or retention period is fabricated.

See the [Level 22 gate table](../audits/level-22-predeployment-hardening.md) and existing
[release operations](deployment-and-release.md), [operations](operations.md), and
[recovery](disaster-recovery.md) runbooks. No X01–X16 gate is complete without live evidence.
