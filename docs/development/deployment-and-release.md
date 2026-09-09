# Staging, production, and release operations

This document is the operational source of truth for Level 11. It describes repository
engineering that is complete and the live gates that cannot pass until RC Premier
Properties supplies domains, providers, accounts, and credentials. It does not claim a
staging or production deployment exists.

See [deployment topology](../architecture/deployment-topology.md) for the trust model.

## Pre-implementation audit and classification

The audit began from clean commit `d6bf6bb` on `feature/performance-optimization`, with
`stash@{0}` present and untouched. Level 6 already supplied the core Auth0, opaque
session, exact-origin, CSRF, MFA, cookie, proxy, header, and safe-error architecture.
Levels 7–10 supplied provider-neutral media/email boundaries, map failure fallbacks,
SEO origin handling, accessibility coverage, and performance constraints.

Status meanings: **implemented** is deterministic repository work; **existing** was
verified and preserved; **configuration** needs real deployment values; **external**
needs an account or live environment; **Level 12** is intentionally deferred.

| Requirement               | Classification and Level 11 result                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 11A topology              | Implemented: recommended same-origin reverse proxy and supported same-site alternative documented                           |
| 11B sessions              | Existing/verified: secure host-only `__Host-`, HttpOnly, Lax cookies; cross-site topology unsupported                       |
| 11C domain                | Configuration/external: strict staging/production HTTPS origin validation; final domain absent                              |
| 11D frontend              | Implemented/verified: Next server build/start, dynamic routes, image/CSP/SEO inputs documented                              |
| 11E backend               | Implemented/verified: compiled Express start, port, fail-closed startup, readiness, bounded shutdown                        |
| 11F runtime               | Existing/verified: Node `>=20.19.0`; CI and recommended deployment runtime use Node 22                                      |
| 11G environment           | Implemented: development/staging/production matrix and templates updated                                                    |
| 11H validation            | Implemented: public origins, Atlas/TLS, proxy, Auth0, media, map, and build inputs validated                                |
| 11I secrets               | Existing/verified: real env files ignored; tracked key/credential scan found templates/test placeholders only               |
| 11J Auth0                 | Existing plus configuration/external: callback pinned to public API origin; tenant setup documented                         |
| 11K MFA                   | Existing/external: `amr: mfa` policy preserved; real tenant factor pass blocked                                             |
| 11L Auth0 live            | Staging/external: login-to-revocation flow not performed without tenant/deployment                                          |
| 11M proxy                 | Implemented/configuration: exact hop count required explicitly in production; host-specific count blocked                   |
| 11N CORS                  | Existing/verified: one exact origin, credentialed wildcard rejected, hostile origins receive no allow-origin                |
| 11O CSRF                  | Existing/verified: session token plus exact origin required for authenticated writes                                        |
| 11P CSP                   | Implemented/configuration: narrow provider-aware policy; real provider origins remain external                              |
| 11Q Next CSP              | Implemented/tested locally: optimized runtime policy supports hydration, Leaflet, images, and embeds                        |
| 11R headers               | Existing plus documented ownership: Next and Helmet policies preserved                                                      |
| 11S HSTS                  | Existing/verified: optimized frontend and production API emit it; ineffective over local HTTP; no preload/includeSubDomains |
| 11T storage               | Existing boundary/external: production adapter and account unselected; upload fails closed with 503                         |
| 11U CDN                   | Implemented boundary/external: one exact HTTPS media origin supported; live CDN unselected                                  |
| 11V media hostname        | Implemented/configuration: exact Next Image/CSP/rendering allowlist; hostname absent                                        |
| 11W storage CORS          | Configuration/external: backend-proxied upload requires no browser write CORS                                               |
| 11X lifecycle             | Documented; automated orphan cleanup deferred to Level 12                                                                   |
| 11Y storage backup        | Provider-dependent/Level 12: versioning and recovery policy awaits provider                                                 |
| 11Z email provider        | Existing boundary/external: provider and credentials unselected                                                             |
| 11AA sender               | External: verified sender/domain, SPF, DKIM, and DMARC await provider/domain; no Gmail password                             |
| 11AB email failure        | Existing plus improved logging: persistence remains source of truth; failure logs only inquiry ID                           |
| 11AC email config         | Provider-dependent: secret stays server-side; exact variables added only with real adapter                                  |
| 11AD email live           | Staging/external: actual receipt at `rcpremierph@gmail.com` not observed                                                    |
| 11AE map provider         | Implemented config boundary/external: public builds require URL and attribution; provider unselected                        |
| 11AF map failure          | Existing/verified: text, cards, retry, boundaries, and privacy remain available                                             |
| 11AG MongoDB              | Implemented/configuration: encrypted non-local URI and explicit database required in production                             |
| 11AH DB resilience        | Existing plus readiness: non-development startup refuses failed DB; runtime readiness follows state                         |
| 11AI indexes              | Production-dependent: representative `executionStats` gate documented; no speculative indexes                               |
| 11AJ health               | Existing plus build ID/no-store: safe liveness exposes no URI or credentials                                                |
| 11AK readiness            | Implemented: `/api/v1/health/ready` returns 503 unless MongoDB is connected                                                 |
| 11AL shutdown             | Implemented: stop accept, close idle/in-flight with bounded grace, then close MongoDB                                       |
| 11AM build                | Verified commands documented; live artifact deployment external                                                             |
| 11AN install              | Existing/verified: root `npm ci`, one authoritative lockfile, shared postinstall build                                      |
| 11AO hygiene              | Existing/verified: env, build output, local media, logs, traces, and caches ignored                                         |
| 11AP CI                   | Existing plus deployment separation: complete local gate remains secret-free                                                |
| 11AQ staging              | Strategy documented; environment does not exist                                                                             |
| 11AR staging data         | Policy documented: synthetic properties only, no production inquiries/rental fixtures                                       |
| 11AS smoke                | Staging-dependent: checklist and safe script implemented; not run against live staging                                      |
| 11AT security             | Staging-dependent acceptance checklist documented                                                                           |
| 11AU media                | Provider/staging-dependent; physical picker remains manual external gate                                                    |
| 11AV email                | Provider/staging-dependent; no live receipt claimed                                                                         |
| 11AW smoke script         | Implemented: read-only HTTPS frontend/API/security checks, no credentials or mutations                                      |
| 11AX production checklist | Implemented below                                                                                                           |
| 11AY rollback             | Implemented below; no destructive data rollback promised                                                                    |
| 11AZ migration            | Not applicable: Level 11 introduces no schema/data migration or startup mutation                                            |
| 11BA build ID             | Implemented: optional sanitized `APP_BUILD_ID` in logs and health responses                                                 |
| 11BB logging              | Existing/reviewed: no tokens, bodies, secrets, or private property location added                                           |
| 11BC errors               | Existing/verified: generic production 500 and bounded redacted server diagnostics                                           |
| 11BD proxy/rate limit     | Existing/configuration: server-generated request context and exact proxy depth; live topology gate remains                  |
| 11BE uploads              | Existing policy/configuration: 12 MB image policy; upstream body limit must be confirmed                                    |
| 11BF timeouts             | Configuration: 15-second smoke timeout and bounded 30-second default shutdown; provider request limits remain external      |
| 11BG CDN cache            | Documented/provider-dependent: versioned immutable public keys, no dynamic/private API caching                              |
| 11BH SEO deployment       | Existing/configuration: strict origin feeds canonical/robots/sitemap; live URL validation blocked                           |
| 11BI social preview       | Staging/external: reachable URL and Facebook crawler/debugger not tested                                                    |
| 11BJ performance          | Existing/verified locally; staging lab and Level 12 field RUM remain external/deferred                                      |
| 11BK accessibility        | External manual gates carried below without claiming completion                                                             |
| 11BL provider record      | Implemented in topology; no unselected provider is presented as chosen                                                      |
| 11BM scope                | Complied: no orchestration, queues, microservices, or speculative IaC                                                       |
| 11BN containers           | Not applicable: no selected target justifies containerization                                                               |
| 11BO selection            | Complied: no account/provider/domain/credential created or invented                                                         |
| 11BP docs                 | Implemented in topology, this runbook, API docs, templates, and roadmap link                                                |
| 11BQ focused tests        | Implemented for origins, Atlas/TLS, Auth callback, CSP, map/media config, readiness, and existing security                  |
| 11BR local gate           | Must pass before Level 11 completion; commands listed below                                                                 |
| 11BS staging gate         | External/blocked until a real staging environment and providers exist                                                       |

## Runtime, build, and start

Use Node.js 22 on CI, staging, and production. The package contract permits Node
`>=20.19.0`; do not deploy an end-of-life runtime. Both applications require a Node
server/runtime—static export hosting is unsupported.

From the repository root:

```text
npm ci
npm run build:deployment
npm run start --workspace backend
npm run start --workspace frontend
```

`npm ci` consumes the single root lockfile and builds `@rc/shared` through postinstall.
`build:deployment` refuses to run unless `NEXT_PUBLIC_DEPLOYMENT_ENV` explicitly selects
`staging` or `production`; ordinary `npm run build` remains the environment-neutral CI
artifact/regression check.
The frontend's `NEXT_PUBLIC_*` values are embedded by `next build`; inject the final
values into the build environment and retain the same values at runtime because Next.js
reloads header/image configuration on server startup. The deployment start wrapper
refuses to run without an explicit staging/production selection. The backend reads its
private configuration when its compiled server starts. Hosts may set `PORT`; do not run
watch or development commands in staging/production.

Deploy the backend and frontend from the same reviewed commit/build ID. The frontend can
temporarily tolerate an unavailable backend through its existing error states, but API
contract compatibility is guaranteed only for same-release artifacts. No Dockerfile is
provided because no selected host requires one.

## Environment matrix

Staging runs both apps with production runtime behavior. Backend `NODE_ENV=production`
keeps secure cookies, real MFA, database startup, and generic errors enabled; frontend
`NEXT_PUBLIC_DEPLOYMENT_ENV=staging` distinguishes its public origin from production.

| Variable                              | Development                  | Staging                                    | Production                                       | Classification                                           |
| ------------------------------------- | ---------------------------- | ------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- |
| frontend `NEXT_PUBLIC_DEPLOYMENT_ENV` | `development`                | `staging`                                  | `production`                                     | Mandatory, public                                        |
| frontend `NEXT_PUBLIC_SITE_URL`       | local default allowed        | exact staging HTTPS origin                 | exact final HTTPS origin                         | Mandatory public deployment config                       |
| frontend `NEXT_PUBLIC_API_URL`        | local default allowed        | exact staging HTTPS API origin             | exact final HTTPS API origin                     | Mandatory public deployment config                       |
| frontend `NEXT_PUBLIC_MEDIA_ORIGIN`   | optional                     | exact HTTPS origin if media exists         | exact HTTPS origin if media exists               | Provider-specific public config                          |
| frontend map URL/text/link            | evaluation defaults allowed  | approved provider values                   | approved provider values                         | Mandatory public deployment config; no secret client key |
| backend `NODE_ENV`                    | `development`                | `production`                               | `production`                                     | Mandatory                                                |
| backend `PORT`                        | defaults to 5000             | host-supplied                              | host-supplied                                    | Optional platform config                                 |
| backend `TRUST_PROXY_HOPS`            | defaults to 0                | exact explicit count                       | exact explicit count                             | Mandatory security config                                |
| backend `SHUTDOWN_GRACE_SECONDS`      | defaults to 30               | platform-compatible bounded value          | platform-compatible bounded value                | Optional, max 120                                        |
| backend `APP_BUILD_ID`                | optional                     | commit/deployment ID                       | commit/deployment ID                             | Optional, non-secret                                     |
| backend `CORS_ORIGIN`                 | local frontend               | exact staging frontend                     | exact production frontend                        | Mandatory security config                                |
| backend `API_PUBLIC_ORIGIN`           | local API optional           | exact staging API                          | exact production API                             | Mandatory production security config                     |
| backend `MEDIA_PUBLIC_ORIGIN`         | optional                     | same as frontend media origin              | same as frontend media origin                    | Provider-specific config                                 |
| backend `MONGODB_URI`                 | local/Atlas                  | staging Atlas secret with staging database | production Atlas secret with production database | Mandatory server secret                                  |
| backend Auth0 group                   | optional as a complete group | dedicated staging values                   | production values                                | Mandatory production mix of config/secrets               |

The Auth0 group is `AUTH0_ISSUER_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`,
`AUTH0_CALLBACK_URL`, `AUTH_ALLOWED_RETURN_URLS`, `AUTH_SESSION_HASH_SECRET`, and the
bounded policy values in `backend/.env.example`. Production rejects an incomplete group,
non-HTTPS browser/callback values, a callback outside `API_PUBLIC_ORIGIN`, a session hash
secret under 32 characters, or weakened MFA/session limits.

Object-storage and email variables do not exist yet because no real adapter/provider was
selected. Add provider-specific server-only variables with the adapter, never speculative
generic keys and never `NEXT_PUBLIC_*` secrets.

## Secret handling and artifact hygiene

Put secrets in the hosting platform's encrypted environment/secret store, separated by
staging and production. Limit operator access and rotate a value after suspected exposure.
Never paste values into issues, CI logs, docs, screenshots, build arguments, images, or
Git. Auth0 client secrets, session hash secrets, Atlas credentials, storage credentials,
and mail API keys are server-only.

Real env files, build output, local upload sources, logs, test output, traces, screenshots,
and caches are ignored. Deployment packages must likewise exclude them. Do not deploy
fixture API data or local property upload directories. The tracked templates contain no
live values.

## Frontend deployment acceptance

- Build and run the Next.js server; do not use static export.
- Confirm strict public configuration accepts the actual HTTPS site/API/map/media origins.
- Route dynamic pages, metadata, `robots.txt`, and `sitemap.xml` through the runtime.
- Preserve Next Image optimization and permit only the configured exact media hostname.
- Confirm CSP hydration, navigation, YouTube privacy-enhanced embeds, map tiles, and image
  optimization in the optimized staging build.
- Verify canonical, Open Graph, Twitter, JSON-LD, robots, and sitemap values use the
  staging host and contain no localhost. Do not submit staging URLs to search engines.
- Confirm `/admin` returns no-store and noindex headers.

## Backend deployment acceptance

- Build TypeScript and run `dist/server.js`; do not start `app.ts` directly.
- Confirm production refuses missing origins, Auth0, proxy decision, or unsafe database.
- Permit the host's assigned port and keep the upstream API request body limit at least
  the application need. JSON remains 1 MB; image upload policy is 12 MB per accepted
  image, so the edge must allow modest multipart overhead without raising an unbounded
  global limit.
- Allow image processing enough provider-measured request time; do not choose a timeout
  until the selected host is tested. Ensure it is bounded and exceeds valid upload work.
- Use liveness at `/api/v1/health` and traffic readiness at
  `/api/v1/health/ready`. Neither endpoint includes connection strings or credentials.
- Send SIGTERM for rollout/scale-down. Express stops accepting work, closes idle
  connections, permits the configured grace interval, force-closes only after the bound,
  then closes MongoDB.

## Auth0 staging and production gate

Use a Regular Web Application with Authorization Code + PKCE. Configure only the exact
HTTPS callback, logout destinations/return URLs, and web origin needed for the chosen
topology. The client secret remains backend-only. Enable a real tenant MFA factor and
policy that produces `amr: mfa`; do not rely on the development-only passkey claim.

On staging, verify login redirect, callback/state/nonce/PKCE, local session creation,
known active `StaffIdentity` access, unknown and disabled staff rejection, every protected
mutation with exact Origin plus CSRF, logout, and session revocation. Inspect the cookie
as `Secure`, `HttpOnly`, `SameSite=Lax`, host-only, `Path=/`, and `__Host-` named. None of
these live checks has been performed for Level 11 without a tenant and public deployment.

## MongoDB Atlas gate

Create separate staging and production databases and least-privilege application users.
Use Atlas TLS/SRV connectivity and restrict network access to the selected backend's
stable egress or private networking. Do not allow broad public ingress as a permanent
shortcut. Keep automatic schema/index behavior reviewed and do not seed production.

Before production traffic, run the actual published-property, facets, map, admin list,
and inquiry queue query shapes against representative cardinality and record
`explain("executionStats")`. Add no speculative indexes from local synthetic evidence.
This Level introduces no migration and performs no silent startup data mutation.

## Staging data and acceptance

Staging uses conspicuously synthetic sale-property fixtures and synthetic staff/inquiries
created for the test. Never copy customer inquiries, session/audit records, exact private
addresses, owner data, or production credentials. Do not expose old rental fixtures on a
public staging catalog.

Run the safe read-only smoke script only after staging is reachable:

```text
SMOKE_FRONTEND_ORIGIN=<staging HTTPS origin>
SMOKE_API_ORIGIN=<staging public API HTTPS origin>
npm run smoke:deployment
```

The script checks public pages, robots/sitemap, liveness/readiness, published property
access, unauthenticated admin denial, CSP/HSTS, admin no-store/noindex, exact allowed
CORS, and hostile-origin rejection. It sends no credentials and performs no mutation.

Then manually exercise homepage, catalog, detail, location explorer, editorial pages,
forms, videos, maps, logo/media, Auth0, admin property/inquiry/viewing flows, CSRF writes,
logout, and the privacy/sales-only boundaries. With real storage, test PNG/JPEG/WebP,
multiple images, cover, reorder, focal point, removal, public derivative, CDN URL, and
sample guard. With real email, persist a legitimate staging inquiry and observe actual
receipt at `rcpremierph@gmail.com`; verify safe content and a protected admin link.

Carry these manual accessibility gates until they are actually performed: real screen
reader, physical Safari/iOS, Android browser, Firefox and WebKit, physical upload picker,
and forced-colors/high-contrast. Also run production-like lab performance measurements;
field Core Web Vitals/RUM belongs to Level 12 after real traffic.

## Production checklist

- [ ] Final domain, DNS, frontend/API origins, and same-origin or verified same-site
      topology are approved.
- [ ] Managed HTTPS is valid; HTTP redirects safely; frontend/backend HSTS headers do not
      conflict; no preload/includeSubDomains assumption was added.
- [ ] Hosting deploys one reviewed frontend/backend build; build ID is recorded.
- [ ] Node runtime and deterministic `npm ci`/build/start commands are configured.
- [ ] Staging and production config/secrets/databases/accounts are isolated.
- [ ] Exact proxy hop count, edge/body timeout, upload size, and client-IP behavior are
      verified from the real request path.
- [ ] Atlas least-privilege user, TLS, network restrictions, readiness, representative
      queries, and execution plans are accepted.
- [ ] Auth0 exact callback/logout/web origins, local StaffIdentity authorization, MFA,
      login, CSRF mutation, logout, revocation, and rejection cases pass on staging.
- [ ] Secure `__Host-`, HttpOnly, Lax, host-only cookies are observed.
- [ ] CORS exact allow and hostile reject pass; credentialed wildcard is absent.
- [ ] CSP, HSTS, nosniff, frame policy, referrer/permissions policy, API no-store, and
      admin no-store/noindex are observed through the edge.
- [ ] Storage/CDN provider, server-only adapter/credentials, UUID versioned keys,
      originals/derivatives policy, exact public media origin, caching, safe removal,
      CORS, versioning, retention, and lifecycle are approved and tested.
- [ ] Transactional email provider, verified sender, server-only key, failure logging,
      and actual receiver delivery to `rcpremierph@gmail.com` are accepted.
- [ ] Final licensed map provider, HTTPS tile template, exposure rules, attribution, CSP,
      performance, fallback, and privacy behavior pass.
- [ ] Canonical, Open Graph, HTTPS images, JSON-LD, robots, sitemap, filter noindex,
      admin noindex, published sales-only inventory, and social preview are validated on
      the reachable production-like host.
- [ ] Read-only smoke script and manual critical public/admin journeys pass.
- [ ] Manual device, browser, screen-reader, upload-picker, and forced-colors gates pass.
- [ ] No secrets, env files, local media, fixture data, traces, or caches are in the
      artifact.
- [ ] Level 12 monitoring, alerting, field RUM, backups, and tested recovery have owners.
- [ ] Traffic enablement and rollback decision makers are identified.

Production traffic must remain disabled while any security-critical item is open.

## Rollback

1. Record the last known-good frontend/backend build IDs and their configuration revision
   before deployment. Keep secret values in the platform store, not the record.
2. Deploy backward-compatible backend changes before dependent frontend changes. Level 11
   adds only optional response fields and a new endpoint, so old/new clients remain
   compatible.
3. If smoke/readiness/security checks fail, stop traffic to the candidate, restore both
   runtimes to the last known-good reviewed build, and restore the matching configuration
   revision. Do not weaken a security value to keep the candidate online.
4. Re-run liveness, readiness, public, unauthenticated admin, CORS, header, SEO, and
   critical manual checks on the restored release.
5. This release has no database migration. Never roll back MongoDB by destructive restore
   merely to roll back application code. Future schema changes require an explicit,
   idempotent migration and forward-fix/restore analysis before deployment.
6. Media records remain URL-compatible. Do not delete or overwrite media during a code
   rollback. Versioned object paths let the prior build continue to reference prior
   derivatives; provider version recovery is a Level 12 capability.
7. Rotate any secret only when exposure or provider policy requires it, then update all
   dependent runtimes consistently and revoke the old value.

## Release gates

Normal pull requests remain secret-free and must pass:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Deployment adds strict real environment validation, the read-only smoke script, and the
manual provider/security acceptance above. CI passing does not prove a live provider,
staging, device, or production environment.

## Level 12 handoff

Level 12 subsequently completed the repository-side safe boundaries and runbooks in
[`operations.md`](operations.md) and [`disaster-recovery.md`](disaster-recovery.md).
Providers were still unavailable, so live monitoring/alerts, RUM, managed backups,
object versioning, restore execution, and recovery evidence remain explicit external
launch blockers. Automatic orphan deletion remains intentionally absent.

Do not implement these in Level 11: monitoring/alert routing, log retention, notification
retry infrastructure, field RUM, automated orphan cleanup, storage/database backup
automation, retention enforcement, or restore testing. Level 12 must select the relevant
providers when they are supplied, collect production evidence, and perform recovery—not
merely document that a backup setting exists. Without those external dependencies, its
repository responsibility is to implement/test the safe boundaries and preserve each
live check as an explicit blocker.
