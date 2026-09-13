# RC Premier Properties — Level 16 Final Production Readiness Audit

- **Audit status:** Complete
- **Date:** 2026-09-10 (Asia/Taipei)
- **Starting commit:** `acab692f591f515dcfa524af90f14942bb0664a6`
- **Branch:** `audit/final-post-enhancement-readiness`
- **Score:** **70 / 100**
- **Classification:** **READY AFTER LEVEL 17**
- **Repository findings:** 0 Critical, 1 High, 9 Medium, 12 Low
- **External/live blockers:** 16 open, X01–X16

This is the authoritative Level 16 audit of the repository after the Level 15 product and
operations enhancement. It preserves the Level 13 audit, Level 14 remediation record and
Level 15 implementation report as historical evidence. No application defect was fixed
and Level 17 was not started.

## 1. Executive summary

The complete local quality gate is green: formatting, linting, typechecking, all 311
Vitest tests, both optimized builds, all 52 Playwright tests, dependency topology and the
high-severity production dependency audit pass. The responsive browser matrix covers 17
widths from 320 through 1920 pixels and 200% root text sizing on representative public and
admin views.

Those results do not establish defect-free production readiness. Source-level failure
analysis found one High media-integrity defect, nine Medium correctness, integrity,
resilience and scale defects, and twelve Low privacy, contract, accessibility and test
defects. In particular:

- an uncertain media metadata commit or a cross-property shared managed URL can lead to
  deletion of an object that remains referenced;
- duplicate-integrity aggregation is not bounded within a duplicate group;
- legacy inquiry notification and workflow facts can be presented as if persisted;
- audit date selection does not match the Manila dates the operator sees, and session
  document identifiers cross the documented audit-view boundary;
- published identifiers can be renamed later, breaking stored inquiry references and old
  canonical URLs;
- optional related inventory can hold the primary detail response for eight seconds;
- sitemap, facet and calendar boundaries do not behave as their documentation/UI claim.

Independent revalidation therefore finds 17 of the 22 Level 14 remediations fully
resolved, three failed/reopened and two partially resolved/reopened. The previous
82/100, `ENGINEERING READY — LIVE ACCEPTANCE REQUIRED` assessment is superseded for the
current repository. Repository remediation is required before staging acceptance can be
treated as a release candidate. Separately, all 16 mandatory external/live gates remain
open and no points are awarded for them.

## 2. Baseline / Git state

| Item                   | Verified state                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Starting commit        | `acab692f591f515dcfa524af90f14942bb0664a6` (`feat: add product and operations enhancements`) |
| Prior evidence         | `24b87ca` Level 14 remediation; `abf4868` Level 13 audit                                     |
| Branch                 | `audit/final-post-enhancement-readiness`                                                     |
| Initial worktree/index | Clean                                                                                        |
| Existing Level 16 work | No report or implementation existed at the verified start                                    |
| Unrelated work         | None modified                                                                                |
| Stash                  | `stash@{0}: On feature/property-media-system: local package-lock change`                     |
| Stash object           | `e3070251f4c5530abd4d2a2410365ab2a0789c2a`, untouched                                        |
| History operations     | No merge, rebase, reset, push or stash apply/pop/delete                                      |

Levels 1–15 and all prior audit/remediation documents remain intact. The only Level 16
changes are this report and its documentation-index entry.

## 3. Audit methodology

The audit continued from the verified Level 15 commit and used these evidence classes:

1. Git, ignored-file, tracked-artifact, current/historical secret-pattern and dependency
   review without printing candidate secret values.
2. Contract-to-controller-to-service-to-model tracing for every Level 15 public and admin
   addition, plus authentication, authorization, privacy, media, inquiry and operational
   invariants.
3. Adversarial query review covering repeated/unknown values, bounds, regex escaping,
   deterministic sorting, pagination, cardinality, projections, indexes and N+1 risk.
4. Failure-order analysis for media metadata, audit insertion, physical removal,
   compensation and cleanup debt, including an injected uncertain-commit reproduction.
5. Accessibility/response-state source review and a production-build Playwright matrix at
   mobile through desktop widths and 200% root text.
6. Independent finding-by-finding revalidation of all 22 Level 14 remediations rather than
   relying on their earlier passing tests.
7. Full local quality gate plus focused security, operations, sitemap, environment,
   deployment and regression suites.
8. Strict separation of repository evidence from provider, infrastructure, real-data,
   physical-device and live acceptance evidence.

No schema, API, UI, dependency, provider, fixture or test behavior was changed.

## 4. Quality-gate results

| Gate                                             | Result                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `npm run format:check`                           | PASS                                                                     |
| `npm run lint`                                   | PASS                                                                     |
| `npm run typecheck`                              | PASS                                                                     |
| `npm test`                                       | PASS — 32 files, 311/311 tests                                           |
| `npm run build`                                  | PASS — shared, backend and optimized frontend; 17 generated routes/pages |
| Strict staging-shaped `npm run build:deployment` | PASS with reserved synthetic HTTPS origins and map/media settings        |
| `npm run test:e2e`                               | PASS — 52/52 Playwright tests in 26.5 seconds                            |
| `npm ls --all`                                   | PASS — valid ESLint 9.39.5 topology                                      |
| `npm audit --omit=dev --audit-level=high`        | PASS — 0 vulnerabilities                                                 |
| Focused Level 14/15/security set                 | PASS — 17 files, 168/168 tests                                           |
| Independent security/integrity focused set       | PASS — 23 files, 253/253 tests                                           |
| Independent admin-operations focused set         | PASS — 3 files, 10/10 tests                                              |

Playwright exercised widths 320, 360, 375, 390, 412, 414, 430, 480, 640, 768, 820,
1024, 1280, 1366, 1440, 1600 and 1920 pixels. Representative public pages, the admin
dashboard and calendar also passed 200% root-text checks. Expected invalid fixture-image
and deliberate error-path logs were observed; no test artifact was retained. Physical
browser zoom, real devices and assistive technology remain X14.

Green gates are necessary but not dispositive: several findings concern combinations,
legacy records, uncertain database acknowledgement and large cardinalities absent from
the current fixtures.

## 5. Critical findings

None confirmed.

## 6. High findings

### L16-H01 — Managed media can be deleted while still referenced

- **Evidence:** `backend/src/modules/properties/property.service.ts:1134-1186,1263-1287`,
  `property.validation.ts:890-897,1116-1119`, `property-media.storage.ts:78-80`, and
  `property.model.ts:189-208`.
- **Root cause:** upload compensation treats every repository exception as a definite
  pre-commit failure. A database write may commit and then lose its acknowledgement, yet
  the catch path deletes the newly stored object. Separately, an adapter-owned URL is
  considered owned solely by its URL pattern; no registry or cross-property reference
  check prevents two records from referencing it before one record removes it.
- **Reproduction:** an injected repository applied the metadata update and then threw;
  metadata retained the new URL while storage removal ran. Removing a managed-looking URL
  from one property also invoked physical deletion without checking another property that
  referenced the same URL.
- **Risk:** a published listing can retain a broken media reference, and an authorized
  writer working on one property can break another property's asset. Recovery may require
  an external object backup that is not yet provisioned. The present production storage
  adapter fails closed, so this is immediately destructive in local/injected deleting
  adapters and becomes production-destructive when X07 supplies a real deleting adapter.
- **Contract conflict:** `docs/architecture/property-media.md:60-63` and
  `docs/architecture/operational-resilience.md:92-98` state that referenced objects survive
  post-commit failures.
- **Level 17:** required; see the complete plan in section 34. This reopens Level 14
  L13-H02.

## 7. Medium findings

### L16-M01 — Duplicate integrity aggregation is not cardinality-bounded

`backend/src/modules/operations/integrity.service.ts:297-354` groups every duplicate ID
for a value into one `$push` array. Cursor `batchSize` bounds result delivery, not the size
of that single group document, and the 500-finding cap is applied only after MongoDB has
constructed it. A sufficiently corrupt group can exceed aggregation/document memory
limits before any safe report is returned. Current tests use small ordinary groups. This
reopens Level 14 L13-M04.

### L16-M02 — Legacy inquiries receive fabricated notification state

`backend/src/modules/inquiries/inquiry.service.ts:564-603` maps missing notification state
to `pending` with zero attempts. The list/detail renders it, but the retry worker cannot
claim a missing notification object and dashboard aggregates do not count it. This
contradicts `docs/architecture/operational-resilience.md:70-74` and
`docs/database/property-and-inquiry-models.md:103-109`, which require legacy absence to
remain visible and not become invented delivery history. Staff can mistake untracked work
for queued work.

### L16-M03 — Missing workflow history is presented as an actual status-change time

For empty inquiry history, `backend/src/modules/inquiries/inquiry.service.ts:611-630`
synthesizes the current status at `createdAt`. For empty viewing history,
`frontend/src/features/admin/AdminInquiryDetail.tsx:439-451` labels inquiry creation time
as “Viewing status changed.” The same UI labels the inquiry fallback as “Inquiry status
changed” at lines 383-394. A legacy record currently `in-progress` can therefore claim it
entered that state when it was created. This conflicts with the Level 15 promise to show
actual stored history timestamps.

### L16-M04 — Audit date controls and displayed dates use different calendars

`backend/src/modules/operations/admin-operations.service.ts:132-135,324-330` applies UTC
midnight bounds, as the API document says. The viewer labels the controls only “From” and
“To” (`AdminAuditViewer.tsx:129-135`) while displaying events in Asia/Manila
(`AdminAuditViewer.tsx:195-198`; `frontend/src/lib/date-time.ts:10-15`). An event displayed
as 2026-09-10 00:30 Manila is excluded by From=2026-09-10 because its instant is
2026-09-09T16:30Z; To=2026-09-10 includes the next Manila morning. Operators can omit or
include the wrong security events.

### L16-M05 — Published public identifiers can later be renamed

Unpublishing is supported, unpublished records are editable, and content update persists
both `propertyId` and `slug` (`backend/src/modules/properties/property.service.ts:790-810,
896-902,1060-1088,1345-1361`). The form keeps both inputs enabled
(`frontend/src/features/admin/AdminPropertyForm.tsx:579-608`). Inquiries retain the public
Property ID as a string, so publish, inquire, unpublish, rename and republish leaves the
inquiry unresolved and the old canonical URL as a 404. Unique indexes prevent collisions,
not renumbering. This violates the requested stable-identifier invariant and reopens
Level 14 L13-M05.

### L16-M06 — Optional related inventory delays the primary detail response

`frontend/src/app/properties/[slug]/page.tsx:66-83` catches related-property failure but
awaits the related promise before returning any JSX. The client read timeout is eight
seconds (`frontend/src/features/properties/property.service.ts:11-18,66-73`). A fast
primary listing with a slow optional related endpoint therefore withholds title, price,
gallery, inquiry actions and structured data until that optional request completes or
times out. Failure is isolated; latency is not.

### L16-M07 — Sitemap 48-record requests are silently reduced to nine

`frontend/src/features/properties/property-sitemap.ts:41-44,59-62,76-79` requests 48
records, but real calls flow through `property.service.ts:21-29` and
`property-query.ts:77-99`, which always serializes `limit=9`. A 20-page shard carries at
most 180 rather than the tested/documented 960 properties, creating about 5.33 times as
many API/count requests and shard URLs. `frontend/test/property-sitemap.test.ts:30-41,
62-105` injects a mock that reports 48 and bypasses the real serializer. The Level 14
sharding architecture is bounded per response, but L13-M10 is only partially resolved in
the integrated path.

### L16-M08 — Calendar overflow is presented as completely reviewable in a truncated view

`backend/src/modules/operations/admin-operations.service.ts:294-313` returns the first 200
schedule-ordered records and `truncated: true`. `AdminViewingCalendar.tsx:111-115` says to
use the “filtered list below for complete review,” but its schedule list maps the same
truncated items at lines 162-181. The separate inquiry list has no date-range control and
sorts by inquiry creation time. Records remain discoverable eventually, but the stated
complete month-review path does not exist and busy-month requests can be overlooked.

### L16-M09 — Public location facets have no output-cardinality bound

Both facet aggregations materialize all distinct city/province combinations, and the
location-count pipeline has no `$limit`
(`backend/src/modules/properties/property.service.ts:666-729`). The homepage renders the
whole array (`frontend/src/app/page.tsx:64-86`) and sitemap shard zero appends every
positive location (`frontend/src/features/properties/property-sitemap.ts:92-96` and
`frontend/src/lib/seo.ts:130-142`). High-cardinality staff-authored locations can grow a
public response, homepage render and sitemap shard linearly without a tested cap.

## 8. Low findings

### L16-L01 — Repeated filters split list and map state

SSR chooses the first array value (`property-query.ts:41-73`), while the hydrated map's
`Object.fromEntries(searchParams.entries())` keeps the last duplicate
(`PropertyResultsExperience.tsx:33-45`). With two `location` values, cards/chips use the
first and map data uses the second. The direct API safely rejects repeats and SEO
noindexes them, so this is a consistency defect rather than injection.

### L16-L02 — Share discloses catalog browsing state

Cards append encoded catalog state as `?from=...`, and native share and clipboard use
`window.location.href` (`PropertyCard.tsx:22`; `PropertyActions.tsx:40-50`). The page
already owns a clean canonical URL but does not pass it to the action. Shared values can
therefore contain search/filter and unknown query fields even though metadata and print
use the canonical listing URL.

### L16-L03 — Out-of-range pages show a false empty-filter result

Pages through 100,000 validate and are not clamped. If `page` exceeds `totalPages`, the
API returns a positive total with no items; `frontend/src/app/properties/page.tsx:138-160`
then says no properties match and suppresses pagination. The only recovery is Clear All,
which also discards valid filters.

### L16-L04 — Legacy copy fallback can lose keyboard focus

`frontend/src/features/properties/PropertyActions.tsx:14-24` focuses a temporary textarea
for `execCommand("copy")`, removes it and does not restore the activated button. Browsers
without Clipboard API can report success while keyboard focus disappears. Existing E2E
asserts only the status message.

### L16-L05 — Cross-admin search transports unused lead PII

`frontend/src/features/admin/AdminSearch.tsx:42-57` stores full inquiry summaries,
including name and email, while lines 159-168 render only ID, type, status and optional
property. The caller already has `inquiry:read`, so this is not an authorization bypass;
it is avoidable network/browser retention that conflicts with a narrow cross-search
projection.

### L16-L06 — Documented staff audit filter has no viewer control

Validation and the API client support `actorStaffIdentityId`, but
`AdminAuditViewer.tsx:61-80,95-137` exposes only action, entity, outcome and dates.
`docs/features/admin-operations.md:48-50` claims the staff filter is available. Operators
cannot use a displayed staff ID to narrow the viewer.

### L16-L07 — Viewings heading order begins at level two

`frontend/src/app/admin/viewings/page.tsx:5-10` renders the calendar first. Its first
heading is `h2` (`AdminViewingCalendar.tsx:82`); the page `h1` appears later in
`AdminInquiryList.tsx:112`. The visual page works and the full reflow gate passes, but the
document outline starts at level two.

### L16-L08 — Delivered notification time is not visible

The API returns `deliveredAt` (`backend/src/modules/inquiries/inquiry.service.ts:597-599`),
but `AdminInquiryDetail.tsx:403-422` displays only last-attempt and next-retry times. This
contradicts the documented visibility of available delivery times and lacks an assertion
despite the E2E fixture carrying the field.

### L16-L09 — Dashboard accepts query parameters contrary to its contract

`docs/api/admin-operations-api.md:19,49-50` says the dashboard accepts no query and unknown
or repeated parameters return 400. `admin-operations.controller.ts:20-22` ignores the
request entirely, so `/dashboard?unknown=x` performs the aggregate and returns 200.

### L16-L10 — New protected operations routes lack HTTP security integration coverage

The source correctly applies fail-closed auth, exact permissions, no-store and noindex,
but `backend/test/admin-operations.test.ts` exercises validators/services and
`e2e/admin-operations.spec.ts` intercepts every operation request. No real route test
proves 503/401/403, the dashboard's dual permission, malformed query handling or private
headers. This is a sensitive regression-detection gap, not a confirmed bypass.

### L16-L11 — Roadmap still describes related properties as deferred placeholders

The approved Level 15 exception is recorded at `docs/ROADMAP.md:59-65`, but the Phase 2A
detail text at lines 425-427 still says similar properties remain a placeholder until
Phase 5E, and its deferred list still includes recommendations. The implemented related
inventory is real, bounded and documented elsewhere; the roadmap is internally stale.
This partially reopens Level 14 L13-L07 documentation reconciliation.

### L16-L12 — Audit viewer exposes database session identifiers

Authentication audit events store an `AuthSession` database ID as `entityId`
(`backend/src/modules/auth/auth.service.ts:188-195,378-385,482-490`). The Level 15 audit
query selects and serializes every entity ID and the UI renders it verbatim
(`backend/src/modules/operations/admin-operations.service.ts:336-356`;
`frontend/src/features/admin/AdminAuditViewer.tsx:202-205`). This is not a cookie, token or
hash and does not enable takeover, but it is an internal session identifier and directly
contradicts `docs/api/admin-operations-api.md:36-38`. No session-event redaction test
exists.

## 9. Informational observations

- No Level 15 authorization bypass, CSRF weakening, permissive CORS change, session-token
  exposure, private-coordinate leak, rental/commercial public leak or fabricated related
  listing was confirmed.
- No tracked secret, private environment file, build output, upload, trace, report dump or
  test artifact was found. Ignored `backend/.env` was identified by name only and its
  contents were not read.
- Level 15 changed no dependency manifest or lockfile. Production dependency audit reports
  zero vulnerabilities.
- CSV uses a UTF-8 BOM, CRLF, quoting and formula neutralization for `=`, `+`, `-` and `@`;
  it exports the current page only and omits phone, message, consent, notes, history,
  notification internals and private coordinates.
- Publication readiness is recomputed server-side, and an atomic version/status predicate
  rejects an intervening edit before transition. Its current source is sound, although a
  direct incomplete-publish service regression would strengthen coverage.
- Canonical/search/form references use `propertyId` and slug rather than MongoDB IDs.
  `#25`, `25` and `Premier Property 25` are not special normalized aliases unless one is
  the stored ID or ordinary keyword content. The public DTO/DOM still carries an opaque
  Mongo-derived `id` as an implementation key; it is not used as the public route or form
  reference.
- Representative Atlas plans/cardinality, provider behavior, production inventory, field
  performance and physical accessibility cannot be inferred from mocks and remain in the
  external matrix.

## 10. Level 15 public discovery audit

| Area                         | Disposition                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sales-only/public projection | PASS: list, map, facets, detail and related enforce published residential sale records and public location/media fields                                       |
| Filter validation            | PASS with L16-L01: scalar API validation, enum/numeric bounds, escaped regex and unknown-field rejection are sound; browser duplicate normalization disagrees |
| Sorting/pagination           | Deterministic `_id` tie-breaks and bounded page sizes pass; out-of-range UX is L16-L03                                                                        |
| Property identifiers         | Human-readable, unique and Mongo-independent; lifecycle stability fails under L16-M05                                                                         |
| Related properties           | Real, current-record excluded, max 12 candidates/max 3 output, deterministic, no N+1/private fields; primary latency isolation fails under L16-M06            |
| Print/share                  | Print uses public DTO and canonical URL; share/fallback defects are L16-L02/L04                                                                               |
| Facets/location discovery    | Public-only but output cardinality is L16-M09                                                                                                                 |
| Sitemap                      | Public-only and sharded; real serializer mismatch is L16-M07                                                                                                  |
| SEO                          | Canonical, robots, structured data, safe media and noindex rules pass locally; final-domain acceptance remains X15                                            |

## 11. Admin operations audit

| Area                            | Disposition                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                       | Persisted aggregate counts, Manila upcoming boundary, terminal exclusion and no customer PII pass; query contract drifts under L16-L09 |
| Viewing calendar                | 42-day validation, active statuses, stable order and narrow projection pass; overflow completeness fails under L16-M08                 |
| Publication readiness           | Backend-derived and transition-enforced; no confirmed bypass                                                                           |
| Cross-admin search              | Escaped/bounded and DOM-minimized; network projection is over-broad under L16-L05                                                      |
| Audit viewer                    | Protected, paginated and value-minimized; L16-M04, L16-L06 and L16-L12 remain                                                          |
| Staff directory                 | Read-only, `staff:manage`, bounded; excludes issuer, subject and session records                                                       |
| CSV                             | Page-only, explicit safe columns and spreadsheet formula neutralization pass                                                           |
| Notification/cleanup visibility | Cleanup count is safe; notification/history facts fail under L16-M02, L16-M03 and L16-L08                                              |

## 12. Security/auth/session/authorization

Auth0/OIDC uses authorization code plus PKCE S256, state and nonce verification, exact
issuer/subject handling and production MFA enforcement. Backend-owned random tokens are
HMAC-hashed at rest; production cookies use `__Host-`, Secure, HttpOnly and SameSite=Lax.
Transactions are one-time, sessions rotate/revoke, idle and absolute expiries are bounded,
and disabled/authorization-changed staff sessions fail closed. Focused auth tests pass.

The Level 15 operation routes require a local session and the named permissions:
dashboard requires both `property:read-private` and `inquiry:read`, calendar requires
`inquiry:read`, audit requires `audit:read`, and staff requires `staff:manage`. All are
read-only and receive private no-store/noindex handling. Existing writes retain exact
Origin, CSRF and optimistic-concurrency enforcement. CORS remains an exact credentialed
origin, with wildcard production configuration rejected.

No bypass was confirmed. L16-L12 is privacy-contract drift, L16-L05 is least-data drift,
and L16-L10 is the missing real HTTP proof for this otherwise-correct route source.
Production Auth0, distributed edge enforcement and live staff acceptance remain X01–X03.

## 13. Data integrity

Unique indexes, deterministic sorts, optimistic version checks, sale-only publication,
inquiry reference validation, notification leases and media cleanup debt remain valuable.
However, L16-H01 can destroy referenced media; L16-M01 can prevent the integrity tool from
reporting extreme duplicate corruption; L16-M05 permits a valid reference to become
orphaned; and L16-M02/M03 present absent legacy facts as persisted facts. Production
cardinality and actual legacy prevalence are unverified under X04/X12.

## 14. Inquiry/viewing workflows

Submission remains an inquiry request, never a calendar-backed appointment. Date/time
validation is Manila-aware, property references resolve, viewing eligibility requires a
published unsold sale listing, terminal schedules/history are preserved and staff writes
retain permission, audit and concurrency controls. Notification lease ownership remains
sound. L16-M02/M03 affect legacy truthfulness, L16-M08 affects busy-range review, and
L16-L08 omits one available operational timestamp.

## 15. Media safety

Upload limits, MIME/signature agreement, image decoding, pixel/dimension/page bounds,
metadata stripping, UUID names, production fail-closed storage and private location/media
projections pass source/test review. Metadata removal still orders commit, audit, then
physical cleanup, and failed removals create durable debt. L16-H01 identifies the missing
uncertain-commit and cross-record-reference boundaries. Production storage/CDN and actual
backup/reconciliation remain X07/X08.

## 16. Location privacy

Public DTOs use precision-aware textual projection and only separately approved public
points. Private address and internal coordinates remain confined to authorized property
detail/edit paths. Related, facets, sitemap, map and CSV do not introduce private
coordinates. No location privacy leak was confirmed. Provider/domain and real-inventory
acceptance remain X10/X12/X16.

## 17. Accessibility/responsive

The executed Playwright width and 200% root-text matrix passes with no measured horizontal
overflow or sibling overlap in its covered routes and states. Skip links, focus
indicators, gallery/dialog controls, reduced motion, form error linkage, live regions and
map/list fallback remain covered.
L16-L04 can lose focus in a legacy copy path and L16-L07 has an incorrect page heading
outline. Calendar overflow also weakens the claimed accessible complete list. Real zoom,
Safari/iOS, Android, Firefox/WebKit, forced colors, screen readers and upload pickers remain
X14.

## 18. SEO/social

Canonical metadata, Open Graph/Twitter data, public-only structured data, robots/noindex,
safe image selection, sales-only discovery and sharded sitemap response headers pass local
review. L16-M05 can invalidate an established canonical slug, L16-M07 amplifies sitemap
work and shard count, L16-L02 shares a noncanonical browsing-state URL, and L16-L11 is
documentation drift. Final-domain crawler/card/search acceptance remains X15.

## 19. Performance

Next image handling, lazy heavy maps/video, bounded ordinary list/map/related outputs,
request deadlines and deterministic queries remain deliberate. L16-M06 adds up to eight
seconds of optional dependency latency to primary detail; L16-M07 adds about 5.33x
sitemap API/count traffic; L16-M09 leaves location output unbounded; and L16-M01 retains a
large-group aggregation failure mode. Field Core Web Vitals/RUM remain X13.

## 20. Database/query/index review

Indexes cover public recency, purpose/type/price, location, beds/baths, featured inventory,
inquiry creation/status/property, viewing date/status, notification leases, sessions,
staff identity and principal audit-time queries. Public list/map/related use projections
and no N+1 was confirmed. Dashboard uses a fixed set of parallel aggregates.

Residual repository query risks are L16-M01, M07 and M09. Unanchored escaped admin search
and optional audit filter combinations may still require production-plan validation; no
representative dataset was supplied, so they are not promoted to repository defects.
Atlas `executionStats`, index inventory, least privilege and actual latency remain X04.

## 21. Deployment

Ordinary and strict staging-shaped builds pass. Environment parsing refuses public
localhost/default origins, unsafe MongoDB TLS forms, missing provider settings and sample
media as production. `app.ts`/`server.ts` separation, readiness, bounded shutdown and the
frontend signal supervisor remain intact. CI still declares dependency, audit, strict
build and browser gates. No real host, proxy, secrets, deploy, smoke, rollback or remote CI
enforcement was exercised; X01/X02 remain blocking.

## 22. Monitoring/operations

Liveness/readiness, generated request IDs, allowlisted structured logs, bounded error
identity, notification retry leasing, cleanup debt and recovery runbooks remain coherent.
No Level 15 path logs request bodies, query values, contact data, messages, cookies,
headers, CSRF, tokens, private address or coordinates. L16-M02/M03/M04/M08 and L16-L08
reduce the truthfulness/completeness of operator-facing data. Central ingestion, alerts,
scheduler, routing, ownership and incident exercises remain X09/X11/X16.

## 23. Backup/recovery

Repository runbooks cover database/media backup alignment, isolated restore, integrity
review, session-secret separation, mail suppression and reconciliation. No provider
backup/PITR or restore rehearsal exists. L16-H01 makes object-version recovery especially
important but does not convert missing live evidence into a repository test result. X05–X08
remain open.

## 24. Test-quality assessment

The suite is broad, deterministic and fully green, with strong public/admin/auth/media,
failure-state, reflow and deployment coverage. The findings show material blind spots:

- uncertain MongoDB commit acknowledgement and cross-property media references;
- very large duplicate groups and high-cardinality location facets;
- legacy records missing notification or either history;
- populated related ranking plus slow/hung optional dependency behavior;
- real sitemap serialization at 48 records;
- duplicate browser query values and page beyond `totalPages`;
- audit Manila/UTC boundaries, session-ID redaction and staff filter UI;
- calendar `truncated: true`, delivered notification time, share payload and fallback
  focus;
- real operation-route 503/401/403/header/query behavior;
- independent negative fixtures for residential rental, commercial sale, draft,
  unpublished and archived leakage.
- computed print-media visibility/privacy; combined filter, chip-removal and Clear All
  browser flows; malformed numeric boundaries; and long-chip, filtered-map, page-two,
  related-card and print responsive states.

Mocks prove component behavior but currently conceal several integration defects. New
tests belong in Level 17; Level 16 did not weaken or rewrite existing tests.

## 25. Level 14 22-finding revalidation

| Level 13 ID | Original severity | Level 16 status                    | Independent result                                                                                   |
| ----------- | ----------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| L13-H01     | High              | Resolved                           | Production MongoDB TLS downgrade, alias, conflict and module-load cases pass; live Atlas remains X04 |
| L13-H02     | High              | **Failed / reopened**              | L16-H01 shows uncertain-commit and cross-record referenced-object deletion paths                     |
| L13-M01     | Medium            | Resolved                           | Terminal viewing schedules/history remain preserved                                                  |
| L13-M02     | Medium            | Resolved                           | New writes and publication remain approved residential sales only                                    |
| L13-M03     | Medium            | Resolved                           | Initial notification/retry lease ownership remains atomic; L16-M02 is separate legacy presentation   |
| L13-M04     | Medium            | **Failed / reopened**              | L16-M01 shows `$push` can create an unbounded duplicate-group document                               |
| L13-M05     | Medium            | **Failed / reopened**              | Reference validation passes at ingestion, but L16-M05 permits later identifier renaming              |
| L13-M06     | Medium            | Resolved                           | Full 200% root-text and width matrix passes; physical acceptance remains X14                         |
| L13-M07     | Medium            | Resolved                           | Loading, anonymous, forbidden, error and authenticated main targets remain focusable                 |
| L13-M08     | Medium            | Resolved                           | Database/API/client deadlines and abort behavior remain covered                                      |
| L13-M09     | Medium            | Resolved (repository)              | Callback failure budget remains separate; shared enforcement remains X01                             |
| L13-M10     | Medium            | **Partially resolved / reopened**  | Shards remain bounded, but L16-M07 invalidates the integrated 48/960 shape and amplifies crawling    |
| L13-M11     | Medium            | Resolved (repository)              | Signal-forwarding wrapper test passes; live supervisor remains X02                                   |
| L13-M12     | Medium            | Resolved                           | CI retains dependency, production audit and strict deployment build gates                            |
| L13-M13     | Medium            | Resolved                           | Workspace environment ignores and tracked examples remain correct                                    |
| L13-L01     | Low               | Resolved                           | ESLint 9 dependency topology is valid                                                                |
| L13-L02     | Low               | Resolved                           | Transformation cleanup failure remains distinctly reported                                           |
| L13-L03     | Low               | Resolved                           | Catalog-specific error copy remains asserted                                                         |
| L13-L04     | Low               | Resolved                           | Display timestamps remain explicit Manila instants; L16-M04 is a new filter mismatch                 |
| L13-L05     | Low               | Resolved                           | Exact admin segment chrome/404 behavior passes full E2E                                              |
| L13-L06     | Low               | Resolved                           | Single map boundary generator and hygiene checks remain                                              |
| L13-L07     | Low               | **Partially resolved / regressed** | L16-L11 finds stale related-property deferral text                                                   |

**Result:** 17 fully resolved, 3 failed/reopened, 2 partially resolved/reopened. This
matrix supersedes the Level 15 assertion that all 22 remained resolved; it does not alter
the historical report.

## 26. External/live blocker matrix X01–X16

All remain mandatory and open. Repository simulations are not live acceptance.

| ID  | Description                                                    | Why required                                                   | Repository status                                            | External owner/action                                               | Verification method                                                             | Production blocking? |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| X01 | Final domains, DNS, HTTPS edge, proxy count, WAF/shared limits | Establish origins, cookies, client IP, TLS and abuse boundary  | Validation/runbook exist; no final topology or edge evidence | Deployment owner selects host/domain and exact hop/edge policy      | External DNS/TLS/header/IP/rate-limit probes                                    | Yes                  |
| X02 | Controlled staging deploy and rollback                         | Prove artifacts, secrets, smoke and rollback off local mocks   | Strict local build/simulation passes; no real deploy         | Deployment/application operators deploy the reviewed commit         | Build ID, smoke/admin/failure evidence, rollback and clean redeploy             | Yes                  |
| X03 | Production Auth0, MFA and session acceptance                   | Prove tenant origins, factors, sessions and recovery           | Auth/session code/tests pass; production tenant unaccepted   | Deployment owner configures tenant; business owner provisions staff | Real login/MFA/callback/session/CSRF/logout/disable/recovery evidence           | Yes                  |
| X04 | Atlas security, least privilege, indexes and query plans       | Prove encrypted access, permissions, cardinality and latency   | TLS/index/query code reviewed; no representative Atlas plans | Database owner provisions and runs representative `executionStats`  | Permission negatives, index inventory, public/admin/ops explain plans           | Yes                  |
| X05 | Atlas backup/PITR policy and completed backup                  | Repository cannot create or prove durable provider backups     | Runbook only                                                 | Database owner configures schedule, retention and alerts            | Provider success/failure, retention and restore-point evidence                  | Yes                  |
| X06 | Isolated database restore rehearsal                            | A configured backup is not recovery evidence                   | Restore procedure documented; no rehearsal                   | Database owner restores; app/incident owners validate               | Timed restore, counts, indexes, integrity, privacy and measured RPO/RTO         | Yes                  |
| X07 | Production object storage/CDN and adapter                      | Durable media delivery and ownership need a live provider      | Production upload fails closed; no provider adapter          | Deployment owner selects provider with least privilege              | Upload/read/delete/rollback, headers, CSP/CORS, ownership and outage evidence   | Yes                  |
| X08 | Media backup/restore and DB-object reconciliation              | Database-only recovery can leave missing/orphaned media        | Recovery/debt model documented; no object rehearsal          | Deployment/database owners restore matching object versions         | Missing/orphan report, derivative regeneration and no unsafe deletion           | Yes                  |
| X09 | Transactional email and verified sender                        | Persisted inquiries need proved delivery and failure handling  | Lease/retry code passes; notifier remains provider-neutral   | Operator selects provider/domain/receiver/credentials               | Receipt, idempotency, retry, outage, terminal failure and alert evidence        | Yes                  |
| X10 | Licensed production map provider                               | Evaluation tiles cannot establish production quota/reliability | Config and fallback exist; no approved provider              | Application/deployment owner approves provider/account              | Tiles, attribution, CSP, quota failure and text/list fallback                   | Yes                  |
| X11 | Central observability, RUM, alerts, routing and on-call        | Local logs/runbooks do not page an accountable operator        | Structured logs/readiness exist; no ingestion or routing     | Operator selects ingestion/probes; business assigns owners          | 5xx/429/auth/email/storage/backup/integrity alert and incident exercise         | Yes                  |
| X12 | Approved representative inventory, media and content           | Fixtures cannot prove real content, privacy or volume behavior | No production inventory/media supplied                       | Business/admin owner supplies and approves real sale data           | Editorial plus public/admin/search/viewing/media/privacy volume checks          | Yes                  |
| X13 | Field Core Web Vitals and RUM                                  | Local lab results cannot prove real-device/network experience  | Local performance/reflow checks pass; no field telemetry     | Operator captures field/staging measurements                        | LCP, INP, CLS and route/resource/error observation                              | Yes                  |
| X14 | Physical browser/device/assistive acceptance                   | Chromium automation cannot prove the required real matrix      | Automated matrix passes; physical/assistive pass absent      | QA/business owner runs signed real-device matrix                    | Safari/iOS, Android, Firefox/WebKit, zoom, screen reader, forced colors, picker | Yes                  |
| X15 | Final-domain SEO/social crawler acceptance                     | Local metadata cannot prove crawler ingestion on final origins | Local SEO works; L16-M07 needs remediation; no live crawl    | Application/business owner verifies live domain                     | Canonical, robots, shards, JSON-LD, cards and 404/noindex fetch/render          | Yes                  |
| X16 | Retention, privacy/legal, purge and named ownership            | Personal/business records need approved lifetime and owners    | Technical minimization/runbooks exist; approval absent       | Business/legal/data owners approve policy and operators             | Access review, safe purge rehearsal, backup interaction and owner sign-off      | Yes                  |

## 27. X17 governance status

X17 remains a non-blocking but recommended governance item: the repository administrator
should enable main-branch protection and required CI checks, then retain settings evidence
and a rejected direct-push test. It is not counted among the 16 launch blockers and no
repository setting was changed in Level 16.

## 28. Files changed

Only legitimate audit documentation is changed:

- `docs/audits/level-16-final-production-readiness.md` — this report, findings, gate,
  revalidation, external matrix, score and conditional Level 17 plan.
- `docs/README.md` — index entry for this report.

No frontend, backend, shared, test, workflow, dependency, lockfile, environment, provider
or generated artifact is changed.

## 29. Documentation status

Levels 13–15 remain preserved as point-in-time evidence. Current feature/API/architecture
documentation generally matches the implemented MVP and properly distinguishes live
provider gates. Confirmed documentation defects are part of the findings rather than
silently corrected: the roadmap contradiction is L16-L11; the audit session-identifier
claim is affected by L16-L12; history/delivery claims are affected by L16-M02/M03/L16-L08; and
the sitemap's asserted 960-record shape is affected by L16-M07.

This Level 16 report is the current readiness source of truth until an authorized Level 17
remediation updates it with new evidence.

## 30. Final launch-readiness score

| Category                 |        Score | Principal deductions                                                               |
| ------------------------ | -----------: | ---------------------------------------------------------------------------------- |
| Core functionality       |      11 / 15 | Mutable public references, calendar/page recovery and no live workflows            |
| Security/auth/privacy    |      12 / 15 | Session-ID exposure, stateful share/PII minimization and live Auth0/edge           |
| Data integrity           |       8 / 12 | Referenced media deletion, scanner group bound, mutable references, legacy facts   |
| Media/location           |        5 / 8 | Media ownership/uncertain commit plus no production storage/recovery/map           |
| SEO/social               |        5 / 7 | Sitemap page-size wiring, mutable canonicals and no live crawler evidence          |
| Accessibility/responsive |        6 / 8 | Heading/fallback focus/calendar completeness and no physical acceptance            |
| Performance              |        5 / 8 | Related blocking, sitemap amplification, facets/scanner cardinality, no field data |
| Deployment               |        6 / 8 | Local builds pass; no real staging/host/proxy/rollback evidence                    |
| Monitoring/operations    |        4 / 7 | Misleading legacy/audit/calendar visibility and no live alerts/scheduler/on-call   |
| Backup/recovery          |        2 / 5 | Runbooks only; no configured backup/PITR or restore/media rehearsal                |
| Testing/documentation    |        6 / 7 | Green broad gate, but integration/cardinality/legacy gaps and stale contracts      |
| **Overall**              | **70 / 100** | **Repository remediation and 16 live gates remain**                                |

This is an evidence score, not a launch probability. It is lower than 82 because the
independent audit reopened material repository guarantees. It does not award credit for
unperformed live acceptance.

## 31. Repository finding counts

| Severity          |  Count |
| ----------------- | -----: |
| Critical          |      0 |
| High              |      1 |
| Medium            |      9 |
| Low               |     12 |
| **Total defects** | **22** |

Informational observations and external gates are excluded from repository defect counts.

## 32. External/live blocker count

**16 mandatory blockers remain open: X01–X16.** X17 is separately recommended and is not
counted as a blocker under the current roadmap.

## 33. Final classification

**READY AFTER LEVEL 17**

This is the only current classification. It means repository-ready to begin live
acceptance after Level 17, not production-ready after Level 17 alone. The repository is
not a release candidate while L16-H01 and the Medium correctness/integrity defects remain,
and production readiness additionally requires every mandatory X01–X16 acceptance gate.

## 34. Level 17 decision

**Level 17 repository remediation is required, but was not started.** The plan below is
the complete remediation input; the affected files for every row are the evidence paths
recorded in sections 6–8. Fixes must preserve the MVP boundary and avoid adding providers,
accounts, calendar availability, analytics or other deferred functionality.

| ID      | Severity / priority | Root cause and affected area                                                              | Recommended fix                                                                                                                                                             | Required regression evidence                                                                                         |
| ------- | ------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| L16-H01 | High / P0           | Ambiguous commit compensation and URL-pattern ownership in property service/storage/model | Give every managed object exclusive durable ownership/reference semantics; on uncertain commit, read/reconcile before deletion; never delete while any record references it | Commit-then-throw retains object; cross-property reference retained; audit/delete/debt ordering still passes         |
| L16-M01 | Medium / P0         | Duplicate scanner `$push` builds an unbounded group                                       | Stream duplicate IDs without per-key arrays, or use bounded database-side windows/count plus ID cursor                                                                      | Very large same-key corruption completes within query/result memory and caps output/counts                           |
| L16-M02 | Medium / P0         | Inquiry serializer converts absent notification to pending                                | Make absence explicit (`untracked`/optional) throughout shared API and every list/detail/search/CSV consumer; keep it distinct from retryable work                          | Legacy absent state, dashboard, list/detail, search, CSV and integrity warning agree                                 |
| L16-M03 | Medium / P0         | Service/UI substitutes creation time for missing history                                  | Represent history as unavailable/empty without inventing transition facts; label known creation separately and report missing legacy history in integrity output            | Empty history at noninitial status and empty viewing history show no fabricated change time; scanner reports absence |
| L16-M04 | Medium / P0         | UTC API range is unlabeled beside Manila-rendered events                                  | Make operator dates Manila calendar dates and convert their inclusive bounds to exact UTC instants in the backend query                                                     | Both Manila midnight boundaries prove displayed dates and included events match                                      |
| L16-M05 | Medium / P0         | Unpublished edit permits previously published ID/slug changes                             | Make Property ID immutable after creation and slug immutable after first publication; reconcile exceptional legacy corrections outside generic edits                        | Publish/inquire/unpublish/edit attempt preserves inquiry and old URL behavior; collision/concurrency tests           |
| L16-M06 | Medium / P1         | Server page awaits optional related promise before JSX                                    | Move related inventory behind a streaming/Suspense boundary or a shorter independently recoverable path                                                                     | Immediate detail with slow/hung/failed related endpoint; fallback and no unhandled rejection                         |
| L16-M07 | Medium / P1         | Catalog serializer hardcodes nine for sitemap callers                                     | Separate trusted internal page-size construction from browser normalization; test real service URL                                                                          | Real serializer sends 48; 20 pages yield 960 shapes; shard/index request budgets and failures                        |
| L16-M08 | Medium / P1         | Calendar warning points to the same truncated data                                        | Add a bounded, paginated, date-filtered complete schedule path and link the overflow notice to it                                                                           | More than 200 records remain reachable in schedule order with truthful accessible guidance                           |
| L16-M09 | Medium / P1         | Facet pipelines and consumers have no location cap                                        | Define business-approved cap/pagination and deterministic overflow behavior; consider caching after correctness                                                             | High-cardinality aggregate/response/home/sitemap stay within documented count and memory budget                      |
| L16-L01 | Low / P2            | First-value SSR and last-value client normalization differ                                | Use one array-aware canonical normalizer for server, client map and navigation                                                                                              | Duplicate each supported filter; list/chips/map/query all agree or reject                                            |
| L16-L02 | Low / P2            | Share uses `window.location.href`                                                         | Pass and share the clean server-owned canonical listing URL                                                                                                                 | Native share and clipboard assert exact canonical URL from filtered/unknown-query entry                              |
| L16-L03 | Low / P2            | Page is not reconciled with `totalPages`                                                  | Redirect/clamp to a valid filtered page or offer truthful filtered recovery navigation                                                                                      | Positive-total page overflow never renders a no-match contradiction                                                  |
| L16-L04 | Low / P2            | Temporary textarea focus is not restored                                                  | Preserve active element and restore focus after fallback success/failure                                                                                                    | Clipboard-unavailable success/failure retains visible focus and live feedback                                        |
| L16-L05 | Low / P2            | Cross-search reuses full inquiry summary DTO                                              | Add a bounded minimized cross-search projection without name/email/message fields                                                                                           | Network payload and stored state contain only displayed safe fields; auth/bounds remain                              |
| L16-L06 | Low / P2            | Viewer omits supported actor filter                                                       | Add an accessible staff-ID filter using the existing validated API field                                                                                                    | Apply/reset/paginate actor filter; invalid IDs remain safe 400                                                       |
| L16-L07 | Low / P2            | Page `h1` is owned by the second child                                                    | Put one page-level `h1` before calendar/list and give child sections ordered headings                                                                                       | Automated heading outline at all admin viewings states                                                               |
| L16-L08 | Low / P2            | UI ignores available `deliveredAt`                                                        | Render the delivered time when present with explicit Manila semantics                                                                                                       | Delivered/pending/retry/terminal states show only applicable real timestamps                                         |
| L16-L09 | Low / P2            | Dashboard controller skips no-query validation                                            | Apply a shared no-query parser before aggregate work                                                                                                                        | Unknown/repeated/object query returns safe 400 and service is not invoked                                            |
| L16-L10 | Low / P1            | Operations tests bypass Express route/middleware                                          | Add Supertest integration against real operation routers and controlled auth dependencies                                                                                   | 503, 401, named 403, dual permission, no-store/noindex and malformed-query cases                                     |
| L16-L11 | Low / P2            | Roadmap phase prose was not reconciled with approved Level 15 exception                   | Reconcile only the related-property status while preserving Phase 2B/5E deferrals                                                                                           | Documentation consistency/link check; no scope expansion                                                             |
| L16-L12 | Low / P1            | Audit projection serializes session entity IDs uniformly                                  | Redact/omit session `entityId` in the DTO while retaining useful noncredential event context                                                                                | Login/logout/revocation session events contain no ID/hash/token; property/inquiry IDs follow policy                  |

Remediation priority order is P0 integrity/truthfulness first, P1 release-resilience and
sensitive integration proof second, then P2 lower-risk UX/contract reconciliation. Live
acceptance begins only after the remediated commit passes the complete gate. The focused
Level 17 set should also add the currently missing direct incomplete-publication service
case before the unchanged full format, lint, typecheck, unit/integration, production build,
strict deployment build, dependency audit and Playwright gates run.

## 35. Git

- **Starting commit:** `acab692f591f515dcfa524af90f14942bb0664a6`
- **Branch:** `audit/final-post-enhancement-readiness`
- **Final audit commit:** the commit containing this report uses subject
  `docs: add final production readiness audit`; its immutable hash is reported in the
  handoff because a commit cannot truthfully contain its own hash.
- **Final worktree/index:** required clean after the audit-only commit and verified in the
  handoff.
- **Stash:** `stash@{0}` remains object
  `e3070251f4c5530abd4d2a2410365ab2a0789c2a`, unapplied and unmodified.
- **History:** no merge, rebase, reset or push.

## 36. Level 16 Definition of Done

- [x] Level 15 baseline and Git state verified; stash untouched.
- [x] Secrets/artifacts and dependencies audited.
- [x] Public filters, sorting, pagination, sale-only boundary, IDs, related, print and
      share audited.
- [x] Dashboard, calendar, readiness, search, audit, staff, CSV, notification and cleanup
      visibility audited.
- [x] Auth0, authorization, sessions, CSRF, CORS, Origin, MongoDB TLS and logging/PII
      audited.
- [x] Inquiry, viewing, media atomicity/upload security and location privacy audited.
- [x] Queries, indexes, N+1 and cardinality audited.
- [x] Accessibility, 200% root-text reflow and responsive matrix tested.
- [x] SEO, performance, deployment, operations, recovery, test quality and documentation
      audited.
- [x] Full quality gate run and recorded.
- [x] All 22 Level 14 remediation items independently revalidated.
- [x] Repository findings severity-ranked separately from X01–X16.
- [x] Final score and exactly one classification produced.
- [x] Conditional Level 17 plan produced because repository defects remain.
- [x] Level 17 not started and application defects not fixed.
- [x] Audit-only files reviewed and committed; final Git/stash state reported at handoff.

**Definition of Done result: PASS for the audit process.** It does not mean the audited
application is ready to launch.

## 37. Recommended next step

After explicit authorization, execute the section 34 Level 17 remediation plan on a
dedicated branch, beginning with L16-H01 and the P0 findings. Re-run the complete quality
gate and independent failure/cardinality regressions. Only after repository closure should
the owners execute X01–X16 in dependency order, beginning with final topology/providers
and a controlled staging deployment.

**STOP: Level 17 was not started.**
