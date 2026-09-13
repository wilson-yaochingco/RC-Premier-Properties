# Level 22 pre-deployment hardening

**C. LEVEL 22 COMPLETE — ENGINEERING READY, EXTERNAL LIVE ACCEPTANCE REQUIRED.**

The requested repository audit, targeted remediation, and full local gate are complete.
No unresolved repository release blocker was identified within the existing MVP boundary.
A complete hosted Vercel beta cannot begin until the owner supplies approved same-site
origins, a separately hosted Express runtime, verified proxy/network configuration,
isolated Atlas and Auth0/MFA configuration, and approved map settings. Media storage and
transactional email still require provider selection, real adapter integration, and live
acceptance. Production launch remains blocked by X01–X16 acceptance evidence.

This report does not certify production readiness, formal WCAG compliance, live email
receipt, production EXIF stripping, Atlas query plans, backups, restores, or physical
device acceptance. No redesign, new product feature, production inventory, provider
configuration change, deployment, merge, rebase, push, or stash mutation occurred.

## Baseline and audit sequence

Baseline: `6d8d774086b29f5a9b123f5776f51f6cb164a34a`, subject
`fix: complete final ux responsive and admin polish`, on
`feature/level-21-targeted-polish`. Status, branch, 25-commit log, unstaged/staged diffs,
and stash list were inspected before creating
`feature/level-22-predeployment-hardening`. The baseline working tree was clean. Preserved
stash: `stash@{0}`, object `e3070251f4c5530abd4d2a2410365ab2a0789c2a`, subject
`On feature/property-media-system: local package-lock change`.

The architecture, roadmap, current feature/deployment/security documentation, middleware,
routes, services, validation, models, frontend delivery, and existing tests were inspected
before remediation. Baseline unit/integration result: **362/362**. Focused tests reproduced
the configuration, indexing, public-reference, logging, and CSV weaknesses before their
fixes; the fixes were then checked independently and through the complete repository gate.

## Application inventory and trust boundaries

| Slice                    | Implemented architecture and inspected boundaries                                                                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root                     | npm workspaces `shared`, `backend`, `frontend`; one lockfile; shared-first postinstall/build; Vitest/Supertest; Playwright/Edge; Prettier; per-app ESLint/TypeScript; GitHub Actions; build/start/smoke/operator scripts; ignored env and artifacts                                           |
| Shared                   | `shared/src/api.ts` owns DTOs, permission names, lifecycle enums, API prefix, media bounds, geographic areas, public/private contracts; shared compiles successfully; no shared test files currently exist                                                                                    |
| Frontend configuration   | Next.js 16.3.3 App Router, React 19.2.8; `next.config.mjs`; JavaScript build-time config reader; statically inlined public env reader; exact API/media/map origins; narrow CSP; Next Image optimization                                                                                       |
| Frontend routes          | Public Home, Properties/detail, Locations/detail, About, Contact, Sell, Book Viewing; Admin dashboard/properties/create/edit/preview/inquiries/detail/viewings/calendar/search/audit/staff; global/domain loading/error/not-found boundaries; robots and sitemap route handlers               |
| Server/client split      | Public inventory reads and metadata on the server; forms, Request Tour, galleries, video facades, and authenticated Admin on the client; bounded shared API client with cancellation/deadlines; no new frontend middleware or public write route handler                                      |
| Express                  | `app.ts` assembles without listening; `server.ts` connects before listening; Helmet → request identity/logging → exact CORS → bounded JSON → API limiter/routers → not-found → four-parameter error middleware                                                                                |
| Authentication           | Backend Auth0 Authorization Code/S256 PKCE; signed OIDC verification; state/nonce; one-time Mongo transactions; server-only client credentials; local staff identities/authorization; opaque hashed sessions; local logout/revocation                                                         |
| Protected APIs           | Properties/private reads/content/lifecycle/availability/Featured/media; inquiry private reads/status/viewing/notes/spam/archive/restore; operations dashboard/calendar/audit/staff; named backend permissions; origin and session-bound CSRF for every mutation                               |
| Database                 | Property, Inquiry, StaffIdentity, AuthSession, OidcTransaction, SecurityAuditEvent, PropertyMediaCleanupTask; unique IDs/slugs/idempotency indexes; session/transaction TTLs; explicit public projections; atomic expected-version filters; bounded pages/maps/calendars/aggregations/cursors |
| Providers and operations | Atlas connection pool/readiness/timeouts; unavailable production storage; disabled notifier plus durable bounded retry leases and CLI worker; scan-only integrity tooling; value-minimized audit/cleanup debt; reviewed public points and deferred Leaflet; local test-only fixture API       |

The public API has no property writes or inquiry reads. Protected HTML provides the
existing client-side staff shell; all private records and mutations are authorized by
the backend. Public property queries require published, supported residential sale
inventory. Public points are independently approved and never derived from private
coordinates. Viewing intake is an inquiry request, not calendar availability or a
confirmed appointment. Existing UI geometry, typography, colors, layout, and behavior
were preserved.

## Finding register

Severity counts below describe observed repository findings, not hypothetical
vulnerabilities inferred from missing external acceptance. No CRITICAL finding was found.

| ID      | Severity      | Classification                                                | Proven problem                                                                                                                                                                                                 | Remediation and result                                                                                                                                                                                                                                                                     |
| ------- | ------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L22-01  | HIGH          | REPOSITORY FIX                                                | Standard Vercel build bypassed the deployment wrapper: omitted/development/test deployment mode was accepted, permitting local defaults and relaxed provider gates; Preview could use production indexing mode | Build-time config rejects insecure hosted Vercel modes; Preview requires staging; explicitly configured staging/production and ordinary test builds remain supported. Eight beta tests cover deployment/indexing behavior; strict Preview-shaped build passes                              |
| L22-02  | MEDIUM        | REPOSITORY FIX                                                | Staging robots allowed public crawling, sitemap fetches advertised inventory, and public metadata lacked beta noindex policy                                                                                   | Staging gets site-wide noindex/nofollow/noarchive headers/metadata, robots disallow-all without sitemap advertisement, and default empty sitemap results without API reads. Unit and six optimized-runtime route checks pass                                                               |
| L22-03  | MEDIUM        | REPOSITORY FIX                                                | Non-viewing public inquiry reference check queried only Property ID, allowing callers to distinguish and attach a private draft/unpublished/archived record                                                    | All public inquiry references now require published, supported residential sale records. Hidden and missing references use the same 400 response; three service regressions prove no persistence or notification. Public sold ordinary inquiries remain allowed; sold tours remain blocked |
| L22-04  | MEDIUM        | REPOSITORY FIX                                                | Request/error logs used raw `req.path`, retaining caller-supplied path values even though query/body logging was excluded                                                                                      | Logs use registered route templates or `unmatched`. Success/not-found and unexpected-error tests exclude synthetic private path values; safe request ID/method/status/duration remain                                                                                                      |
| L22-05  | LOW           | REPOSITORY FIX                                                | CSV formula neutralization omitted newline/Unicode whitespace prefixes                                                                                                                                         | Formula-prefix check accepts all JavaScript whitespace; four prefix regressions pass. Normal API trimming already limits reach; this is defense for legacy/other valid typed export data. No spreadsheet exploit is claimed                                                                |
| L22-06  | LOW           | REPOSITORY FIX                                                | Deployment smoke script duplicated the API version literal rather than using the shared contract                                                                                                               | Script imports `API_PREFIX` from `@rc/shared`; root installation/build resolves it. No live smoke was run                                                                                                                                                                                  |
| L22-E01 | MEDIUM        | CONFIGURATION FIX; LIVE ACCEPTANCE REQUIRED                   | Functions' documented 4.5 MB payload limit conflicts with the current 12 MB upload policy; process-local limiters are not a shared serverless limit                                                            | Recommend Vercel Next.js plus separate persistent Express host with fixed same-site HTTPS origins. Functions adaptation is not implemented or claimed accepted                                                                                                                             |
| L22-E02 | INFORMATIONAL | CONFIGURATION FIX; LIVE ACCEPTANCE REQUIRED                   | Approved hosted origins, API hosting, proxy count, Auth0/MFA, Atlas security, and real map/provider settings are absent                                                                                        | Explicit prerequisites and environment matrix in the beta runbook; no wildcard preview strategy, weaker cookies, or invented provider values                                                                                                                                               |
| L22-E03 | INFORMATIONAL | LIVE ACCEPTANCE REQUIRED; EXTERNAL BUSINESS/LEGAL REQUIREMENT | Live media/email, backup/PITR/restore, monitoring ownership, approved inventory/privacy/retention, final-domain crawlers, physical devices, and field performance evidence are absent                          | Keep X01–X16 open and assign exact owner actions; provider adapter integration will require scoped follow-up after provider selection                                                                                                                                                      |

Repository findings: **1 HIGH fixed, 3 MEDIUM fixed, 2 LOW fixed; 0 unresolved**. The
separate runtime compatibility finding is addressed by the documented deployment
architecture and remains subject to live acceptance, not an unperformed backend rewrite.

Vercel presently supports Express listeners/default exports; `listen()` alone is not a
valid incompatibility claim. Its Function limit and runtime characteristics were checked
against [official Express guidance](https://vercel.com/docs/frameworks/backend/express)
and [Function limits](https://vercel.com/docs/functions/limitations). Monorepo/root and
platform env assumptions use [Vercel monorepo guidance](https://vercel.com/docs/monorepos/monorepo-faq)
and [system variables](https://vercel.com/docs/environment-variables/system-environment-variables).
Installed Next.js guides for headers, robots, and environment loading were also read.

## Secret and artifact evidence

The baseline scan covered **353 tracked files**, tracked text, source/scripts/docs/tests,
environment templates, and reachable local Git patch history (`--all`). It looked for
private-key blocks, recognizable service tokens, credentialed URLs, and assigned secret
patterns. It reported paths/categories only. Nine current candidates were test inputs or
explicit documentation placeholders; nine historical candidate groups were likewise test
fixtures or placeholders. Historical initial env/setup credentialed URIs were checked to
contain explicit angle-bracket placeholders. Neither current nor reachable history
tracked a real env variant or private-key file; historical env paths were only the two
`.env.example` templates. Real env variants pass `git check-ignore`.

**No active committed secret was identified.** This is a scoped pattern/manual review,
not proof about unavailable remote/dangling history, ignored local secrets, or every
possible credential format. No real credentials were printed or rotated. Templates use
local evaluation settings and empty auth/provider fields, not live credentials.

Final strict staging build artifact inspection found **26 runtime tracing manifests**,
no test/e2e/env/private-key/log/local-source entries in their traced files, no tracked
artifact candidates, and no public browser source maps in the generated chunk directory.
Playwright screenshots/traces, Vitest JSON, `.next`, `dist`, caches, local upload sources,
and npm logs are ignored. Final deployment must build from source with real approved
configuration; the local fixture-shaped build is not a deployable acceptance artifact.

## Verification and failure classification

| Check                           | Observed result                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline unit/integration       | 362/362                                                                                                                                                                                                               |
| Final full unit/integration     | **380/380; 37 files; 297 backend, 83 frontend; zero failures/skips**                                                                                                                                                  |
| Security-focused suite          | **112/112; 5 files**: security-hardening, auth.integration, auth.oidc, env.production, beta-deployment                                                                                                                |
| Complete Playwright             | **82/82; system Edge; four workers; 59.3 seconds; zero failures/skips/retries**                                                                                                                                       |
| Responsive/accessibility        | All existing browser cases pass, including 320, 390, 768, 1024, 1280, 1440, 1920; 320/390 + 200% text; keyboard/focus/dialogs/drawers/forms/landmarks/reduced motion/map alternatives/gallery; no certification claim |
| Maps                            | Existing privacy/lazy-loading/boundary/region/list tests pass; new aborted-tile-provider test retains filters and listing links                                                                                       |
| SEO                             | Existing production/test public SEO regressions pass; staging unit and optimized-runtime indexing checks pass                                                                                                         |
| Formatting                      | `npm run format:check` passes; final report/document formatting checked after writing                                                                                                                                 |
| Lint                            | Both workspaces pass                                                                                                                                                                                                  |
| Typecheck                       | All workspaces pass; shared built first and Next route types regenerated                                                                                                                                              |
| Production build                | Root `npm run build` passes shared/backend/optimized Next.js compilation and route generation                                                                                                                         |
| Preview/staging-shaped build    | `npm run build:deployment` passes with `VERCEL=1`, `VERCEL_ENV=preview`, `staging`, and isolated HTTPS `.example.test` API/site/media/tile/attribution inputs                                                         |
| Optimized staging runtime       | **6/6** local route checks: Contact, Sell, Admin, robots, sitemap index, sitemap shard; correct noindex headers/metadata, disallow-all robots, empty sitemap XML                                                      |
| Local modest performance sanity | **100/100** sequential routing requests, half property search/half readiness, injected services only; mean 2.97 ms, p95 4.29 ms, max 21.90 ms; no database/provider/load capacity claim                               |
| Dependency tree                 | `npm ls --all` exit 0; no invalid/extraneous required dependencies; platform-specific optional packages are legitimately absent on Windows                                                                            |
| Production vulnerability audit  | `npm audit --omit=dev --json`: **0 critical/high/moderate/low/info**                                                                                                                                                  |
| Complete vulnerability audit    | `npm audit --json`: **0 vulnerabilities**; dependency metadata 126 production, 488 development, 139 optional, 649 total (categories overlap)                                                                          |
| Git whitespace                  | `git diff --check` passes                                                                                                                                                                                             |

Gate commands used `npm.cmd` from the root because this Windows PowerShell policy blocks
`npm.ps1`; no policy was weakened. The sandbox initially prevented Git ref creation and
the advisory HTTP request; authorized escalation completed both actions. There was no
automatic approval rejection or outstanding permission blocker.

Intentional pre-fix test failures are classified **REAL REGRESSION / confirmed existing
defect**, and all pass after remediation. Two new-test setup defects (Vitest's missing
Next alias resolution and reversed injected constructor arguments) were classified
**TEST DEFECT** and corrected without weakening assertions. Passing an env template to
Prettier explicitly was an **ENVIRONMENT/TOOLING ISSUE**: the format tool has no env
parser; the normal repository formatting gate passes. Browser stderr includes deliberately
unavailable fixture image/provider responses and interrupted navigation streams; these
are fixture/error-path output, not failed assertions or hidden live provider acceptance.
No test was removed, skipped, or broadly retried. No external provider was stress-tested.

## Requested 71-point handoff

| #   | Area                        | Result and material limit                                                                                                                                                                                                                      |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Baseline commit             | `6d8d774086b29f5a9b123f5776f51f6cb164a34a`                                                                                                                                                                                                     |
| 2   | Final branch                | `feature/level-22-predeployment-hardening`                                                                                                                                                                                                     |
| 3   | Overall verdict             | C: engineering complete, external live acceptance required                                                                                                                                                                                     |
| 4   | Critical findings           | None identified                                                                                                                                                                                                                                |
| 5   | High findings               | L22-01 fixed; deployment mode fails closed on hosted Vercel                                                                                                                                                                                    |
| 6   | Medium findings             | L22-02–04 fixed; runtime mismatch handled by separate-host recommendation                                                                                                                                                                      |
| 7   | Remaining repository issues | No observed unresolved MVP release blocker; production storage/email adapters intentionally absent and require scoped integration after selection                                                                                              |
| 8   | Secret audit                | Tracked/reachable history candidates reviewed; no active secret found; templates/ignore rules verified; no rotation                                                                                                                            |
| 9   | Environment validation      | Backend production rejects missing Auth0/origins/proxy, TLS downgrades, weak policy/debug logs; frontend strict public and Vercel Preview gates pass                                                                                           |
| 10  | Authentication              | Code + PKCE/state/nonce/signed token/callback/return validation pass local provider fixture tests; real Auth0 acceptance open                                                                                                                  |
| 11  | Sessions                    | Opaque token, keyed hash, HttpOnly/Secure/host-only/Lax/Path `/`, idle/absolute expiry, rotation/revocation/version checks preserved; no session token in browser storage; live proxy/device proof open                                        |
| 12  | Authorization               | All existing protected reads/mutations use named backend permissions; negative tests pass; staff/audit operations remain read-only APIs with controlled CLI mutation                                                                           |
| 13  | CSRF                        | Exact origin plus session-derived token; missing/invalid/cross-session rejections pass                                                                                                                                                         |
| 14  | CORS/origin                 | One exact credentialed allow-origin; hostile origin receives no allow-origin; writes independently reject origin; fixed approved preview strategy only                                                                                         |
| 15  | Headers                     | Narrow provider CSP, nosniff/referrer/frame/permissions, production HSTS; protected no-store/noindex; staging site-wide noindex; Next inline script/style compatibility remains documented                                                     |
| 16  | Input validation            | Backend bounds/types/enums/unknown fields/IDs/dates/pages/media are independent of forms; malformed/oversized/operator/repeated values rejected                                                                                                |
| 17  | Injection/XSS               | Mongo filters safely constructed; user regex escaped/bounded; React text and DOM textContent; raw HTML limited to escaped JSON-LD and static/numeric map markup; safe media/redirect URLs; CSV whitespace gap fixed                            |
| 18  | Rate limiting               | API 300/IP/15 min; inquiry 5/IP/15 min; login/callback protections; health excluded; untrusted forwarding spoof regression passes; real proxy depth and horizontal-store/edge acceptance open                                                  |
| 19  | Property lifecycle          | Published-sale predicates exclude draft/unpublished/archive/unsupported inventory; invalid transitions and sold terminal availability tested; restore uses draft/unpublished, never implicitly publishes                                       |
| 20  | Featured                    | Publication/residential-sale/sold eligibility, deterministic priority/date/ID ordering, three-card homepage bound and empty states preserved; private internal flag does not override public filters                                           |
| 21  | Concurrency                 | Atomic expected-version filters/increments protect content/lifecycle/availability/Featured/media/inquiry/viewing changes; stale updates return 409; actual Atlas concurrent acceptance open                                                    |
| 22  | Inquiries                   | Typed/minimized acknowledgement, honeypot, hashed unique idempotency, duplicate-race handling, notes/history/audit/spam/archive/restore; private-reference leak fixed                                                                          |
| 23  | Viewings                    | Published not-sold residential sale context, future Manila schedule, requested/unconfirmed success, terminal/synchronized transitions/history, context-aware header CTA preserved                                                              |
| 24  | Database/index/query        | Unique/compound indexes, explicit projections, bounded limits/cursors/aggregations, operation deadlines inspected; no Atlas explain, production cardinality, or pool sizing claim                                                              |
| 25  | Public privacy              | Explicit public serializers/location precision/projections exclude addresses/private coordinates/owner/contact/staff notes/audit/workflow metadata; stable gallery IDs retained where needed by the UI                                         |
| 26  | Maps                        | Approved publicPoint only; lazy Leaflet, locality aggregation, zero-count omission, boundary failure, tile failure, list fallback, canonical links and mobile List-first pass; real licensed tiles open                                        |
| 27  | Media                       | 24-image/12 MB limits; MIME/signature/decode/dimension/pixel/animation checks; server keys; cover/reorder/version validation; owned safe deletion and cleanup debt; production storage 503; EXIF live gate                                     |
| 28  | Errors                      | Correct 400/401/403/404/409/429/413/415/500/503 distinctions; production 5xx hides message/details; no raw exception stacks/URIs/provider secrets in API output                                                                                |
| 29  | Logging/PII                 | Allowlisted JSON + server UUID; no body/header/query/token/error-message capture; route parameters removed; audit remains minimized; no new vendor                                                                                             |
| 30  | Frontend performance        | Deferred maps, click-to-load YouTube, progressive responsive images, stable dimensions, bounded API deadlines, layout/initial JS browser budgets pass; field CWV/RUM open                                                                      |
| 31  | Backend performance         | Parallel bounded reads/projections/limits and 10-second DB bounds; 100 local routing checks pass; hosted pool/query/latency/SSR quota acceptance open                                                                                          |
| 32  | Accessibility               | Existing representative keyboard/focus/dialog/form/gallery/map/reduced-motion/reflow regressions pass; physical assistive technology open                                                                                                      |
| 33  | SEO/indexing                | Metadata/canonicals/JSON-LD/OG/sitemap/404 regressions pass; Admin never indexable; staging crawler protections fixed; final-domain crawler evidence open                                                                                      |
| 34  | Content/trust               | No new claims or fake listings; fixtures/development sample media remain test/dev scoped; current channels/editorial content tests pass; owner-approved real inventory/business content open                                                   |
| 35  | Privacy/legal               | No approved policy supplied; consent controls exist and can receive a reviewed policy link; legal/privacy approval and purge ownership required before real intake; no invented legal terms                                                    |
| 36  | Dependency tree             | Exit 0; no required peer/topology failure; legitimate absent optional platform packages                                                                                                                                                        |
| 37  | Vulnerability audit         | Production and full npm audits both zero; no dependency upgrade/lockfile change                                                                                                                                                                |
| 38  | CI                          | Existing workflow covers install/topology/audit/format/lint/type/test/optimized and strict staging builds/E2E; uses Node 22 and isolated config; no live secrets needed; remote run not claimed                                                |
| 39  | Health/readiness            | No-store liveness 200 and DB-backed readiness 200/503; no credential/URI details; optional safe build identity                                                                                                                                 |
| 40  | Empty/error states          | Browser cases verify public/admin unavailable, loading, empty, validation, success and media/map fallback; no redesign; no live provider success fabricated                                                                                    |
| 41  | Routes/links                | Current public/admin/navigation/location/property links, old Book Viewing entry, safe external/contact URLs, malformed/rental/missing 404s and canonicals pass; no deprecated-route technical copy added                                       |
| 42  | Realistic data              | Existing synthetic fixtures/tests cover zero/one/paged/more-than-homepage Featured, no Featured, long/bounded facts, media bounds/one image/missing optional data, lifecycle visibility and zero/multiple location counts; no production seeds |
| 43  | Production artifacts        | 26 trace manifests free of env/tests/e2e/private keys/logs/local sources; no browser chunk source maps or tracked debug artifacts; final local build strict staging-shaped and ignored                                                         |
| 44  | Vercel monorepo             | Frontend root + outside-root inclusion + root npm ci/shared-first build documented; actual hosted project/root settings still owner-configured                                                                                                 |
| 45  | Vercel frontend             | Standard Next.js managed runtime/route handlers/SSR/Next Image supported; strict Preview-shaped local compilation/runtime pass; actual Vercel build not performed                                                                              |
| 46  | Vercel Express              | Not accepted as a Functions deployment: upload payload, memory limiters, connection/start/CLI jobs need work; no backend rewrite                                                                                                               |
| 47  | Recommended topology        | Vercel Next.js + separate persistent Node Express, fixed same-site beta origins or managed single public edge                                                                                                                                  |
| 48  | Beta env readiness          | Names/exposure/required/optional/dev/test/beta/prod matrix documented; isolated shape tested, real values absent                                                                                                                               |
| 49  | Auth0 beta                  | Exact API callback/frontend return/logout/web-origin and MFA/local staff requirements documented; no new audience needed; tenant/session/live acceptance open                                                                                  |
| 50  | Atlas beta                  | TLS/db/user/index/network/static egress/timeouts/readiness requirements documented; no live network/query plan/provider changes                                                                                                                |
| 51  | Storage beta                | Unselected/unimplemented production adapter; durable object/CDN ownership/recovery/metadata stripping acceptance required; no Vercel disk substitute                                                                                           |
| 52  | Email beta                  | Disabled production notifier; database success truthful; real adapter/idempotency/sender/retry job/receipt acceptance required                                                                                                                 |
| 53  | Map beta                    | Strict template/attribution/CSP/fallback ready; approved provider/domain/license/quota acceptance required                                                                                                                                     |
| 54  | Rollback                    | Compatible immutable frontend/API/config versions and post-rollback smoke documented; actual hosted rehearsal open                                                                                                                             |
| 55  | Observability               | Safe logs/readiness and existing status/debt/notification aggregates available; monitor/error/quota/alert/owner checklist documented; no live alert proof                                                                                      |
| 56  | Backup/PITR                 | Provider configuration/completion evidence absent; owner action required                                                                                                                                                                       |
| 57  | Restore rehearsal           | Existing isolated rehearsal procedure available; no restore performed                                                                                                                                                                          |
| 58  | Retention                   | No approved period/purge policy; qualified owner/legal review required; no data deletion                                                                                                                                                       |
| 59  | Documentation               | New beta runbook + this audit; current topology/release/logging/inquiry/SEO/index docs and frontend template updated; historical audits untouched                                                                                              |
| 60  | Files changed               | Explicit inventory below; no package/lockfile or CSS/UI layout change                                                                                                                                                                          |
| 61  | Unit/integration exact      | 380/380 across 37 files; 297 backend, 83 frontend                                                                                                                                                                                              |
| 62  | E2E exact                   | 82/82, zero skips/retries/failures                                                                                                                                                                                                             |
| 63  | Security exact              | 112/112 across the five named focused files                                                                                                                                                                                                    |
| 64  | Responsive/reflow           | Required seven widths and 320/390 at 200% text pass within full E2E; no physical zoom/device claim                                                                                                                                             |
| 65  | Production build            | Full optimized root build exit 0                                                                                                                                                                                                               |
| 66  | Preview build               | Strict Vercel Preview/staging-shaped deployment build exit 0 and 6/6 local runtime checks                                                                                                                                                      |
| 67  | npm ls                      | `npm ls --all` exit 0                                                                                                                                                                                                                          |
| 68  | Dependency vulnerabilities  | 0 production; 0 full dependency audit                                                                                                                                                                                                          |
| 69  | Commit hash                 | Report is part of `fix: harden application for beta deployment`; exact final hash supplied in final handoff (a commit cannot contain its own hash)                                                                                             |
| 70  | Git status                  | Intended files explicitly staged/reviewed; post-commit status recorded in final handoff                                                                                                                                                        |
| 71  | Preserved stash             | Object and subject unchanged; never applied/popped/dropped/modified                                                                                                                                                                            |

## X01–X16 external launch gates

No gate is marked COMPLETE without evidence. READY FOR BETA/LIVE TEST below means the
local checks/procedure can now be used for acceptance after the hosting prerequisites;
it does not mean a device, provider, or hosted deployment already passed.

| Gate                              | Status                   | Evidence                                                                                           | What remains                                                                                                                               |
| --------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| X01 edge/DNS/TLS/proxy/WAF        | BLOCKED                  | Exact origins, Secure cookies, HSTS, proxy-hop/startup gates and topology documented               | Owner selects beta HTTPS origins/edge/API host, verifies routing/proxy depth/network restriction/WAF, then final-domain DNS/TLS acceptance |
| X02 beta/staging + rollback       | BLOCKED                  | Optimized/Preview-shaped build, 6 local smoke checks, beta runbook and rollback procedure          | Approved hosts/origins/Auth0/Atlas/map config; separately authorize deployment; complete hosted smoke and rollback rehearsal               |
| X03 Auth0/MFA/session             | BLOCKED                  | 68 auth integration + 14 OIDC fixture tests; fail-closed production assurance/cookies              | Isolated tenant callbacks/returns/MFA/local staff; real edge/browser login/session/logout/revocation/recovery evidence                     |
| X04 Atlas security/query plans    | BLOCKED                  | TLS/default timeout/projection/index/query-bound tests and source review                           | Isolated hosted cluster/user/network, actual deployed indexes, query plans/representative cardinality/pool/reconnection evidence           |
| X05 backups/PITR                  | BLOCKED                  | Existing recovery/operations procedures                                                            | Provider backup/PITR policy, completion alerts, approved RPO/RTO and owner evidence                                                        |
| X06 isolated restore              | BLOCKED                  | Documented scan-only integrity and isolated restore procedure                                      | Actual isolated database/media restore and integrity/workflow rehearsal evidence                                                           |
| X07 media storage/CDN             | BLOCKED                  | Validated storage interface, upload/security/version/compensation tests, deliberate production 503 | Choose/integrate durable real adapter/CDN, credentials, privacy transforms, live upload/delivery/owned deletion evidence                   |
| X08 media reconciliation/recovery | BLOCKED                  | Protected cleanup debt/reference reconciliation and recovery procedure                             | Real object namespace/versioning, scan/report/review ownership, reconciliation and media recovery rehearsal                                |
| X09 transactional email           | BLOCKED                  | Durable inquiry success, leased bounded retries, disabled adapter and safe delivery status         | Choose/integrate provider/sender/idempotency/scheduler; DNS authentication where required; real receipt and outage/retry evidence          |
| X10 map provider                  | BLOCKED                  | Strict public config/attribution/CSP; privacy/lazy/boundary/tile/list browser tests                | Approve licensed domain-authorized provider/key scope; live rendering/quota/outage/attribution acceptance                                  |
| X11 monitoring/ownership          | BLOCKED                  | UUID structured minimized logs, readiness, operational status/debt aggregates, incident checklist  | Choose platform monitoring, assign on-call/retention, wire alerts and prove test incidents without PII capture                             |
| X12 real inventory/media/content  | BLOCKED                  | No production seed data or invented records/claims; synthetic tests isolated                       | Supply/approve real listings/photos/public-point disclosure/business content/contact/rights                                                |
| X13 field CWV/RUM                 | READY FOR BETA/LIVE TEST | Local browser JS/layout/progressive media/lazy map budgets pass                                    | Real beta mobile network/device performance, approved privacy-safe RUM if selected, final field measurements                               |
| X14 physical devices/AT           | READY FOR BETA/LIVE TEST | 82 Edge browser cases including keyboard/reduced motion/required widths/200% text                  | Physical iOS/Android/desktop browsers, real keyboards/zoom/screens/readers and owner acceptance; no formal certification                   |
| X15 final SEO/social crawlers     | BLOCKED                  | Public production/test metadata/sitemap/404 tests and staging noindex pass                         | Approved final domain/inventory/social images, live crawler/social previews/robots/canonical/sitemap acceptance; keep beta noindex         |
| X16 legal/privacy/retention/purge | BLOCKED                  | Explicit consent and minimized DTO/log/audit design; no fabricated policy/period                   | Qualified approval of notice/link/intake, retention/purge requests, provider/data handling, responsible owners before real data            |

## Release classification and next action

**RELEASE BLOCKERS:** no observed remaining repository blocker for the authorized MVP
engineering slice. Hosted beta remains blocked by the concrete prerequisite configuration
in X01–X04/X10, access/ownership decisions, and approved privacy/data-intake boundaries.
No public production release is approved while X01–X16 acceptance remains open.

**BETA ACCEPTANCE ITEMS:** configure isolated hosts/same-site origins/edge, Atlas,
Auth0/MFA/local staff and licensed map settings; restrict beta access; run hosted auth,
origin/CSRF, core public/admin workflow, outage/readiness/quota, media/email when integrated,
and rollback smoke. Use safe approved beta data; disabled uploads/email must remain an
explicit test limit until adapters and live evidence exist.

**FINAL PRODUCTION ACCEPTANCE ITEMS:** real inventory/media/content and rights; final
DNS/TLS/proxy/WAF; production Auth0/recovery/Atlas query plans; durable storage/recovery;
real transactional delivery; monitoring/alerts; backups/PITR/isolated restore; physical
devices/assistive technology and field CWV; final-domain SEO/social crawlers; approved
legal/privacy/retention/purge ownership.

**POST-LAUNCH IMPROVEMENTS:** only evidence-driven query/deep-pagination tuning, shared
limiter/scaling decisions if scale requires them, or a CSP nonce migration if its benefit
justifies changing Next's current inline compatibility. These are not newly implemented
features or authorization for another level.

The immediate owner action is to supply the fixed beta topology/provider/configuration
inputs described in [Controlled Vercel beta](../development/vercel-beta.md). No credentials
should be pasted into this report. **Stop after this report. Deployment, DNS, live tenant
changes, production users/data/emails and another level require a new instruction.**

## Explicit changed-file inventory

- `backend/src/lib/request-route.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/requestLogging.ts`
- `backend/src/modules/inquiries/inquiry.service.ts`
- `backend/test/inquiry.service.test.ts`
- `backend/test/operational-resilience.test.ts`
- `backend/test/security-hardening.test.ts`
- `frontend/next.config.mjs`
- `frontend/src/app/robots.ts`
- `frontend/src/features/admin/admin-csv.ts`
- `frontend/src/features/properties/property-sitemap.ts`
- `frontend/src/lib/next-config-env.cjs`
- `frontend/src/lib/seo.ts`
- `frontend/test/admin-csv.test.ts`
- `frontend/test/beta-deployment.test.ts`
- `frontend/.env.example`
- `e2e/property-map.spec.ts`
- `scripts/deployment-smoke.mjs`
- `docs/README.md`
- `docs/architecture/deployment-topology.md`
- `docs/architecture/operational-resilience.md`
- `docs/development/deployment-and-release.md`
- `docs/development/vercel-beta.md`
- `docs/features/inquiries.md`
- `docs/features/seo-and-social-discovery.md`
- `docs/audits/level-22-predeployment-hardening.md`
