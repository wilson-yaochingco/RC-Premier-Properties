# RC Premier Properties — Level 15 Product & Operations Enhancements

- **Implementation status:** Repository work complete; final clean gate recorded below
- **Date:** 2026-09-10 (Asia/Taipei)
- **Starting commit:** `24b87ca51ab81b6ebfc4753f96d90c2ee6e6a14c`
- **Branch:** `feature/product-operations-enhancements`
- **Level 14 classification:** **ENGINEERING READY — LIVE ACCEPTANCE REQUIRED**, 82/100
- **Updated classification:** **ENGINEERING READY — LIVE ACCEPTANCE REQUIRED**, 82/100

This report covers only the approved Level 15 repository slice. Levels 1–14 and the
historical Level 13/14 reports remain intact. No Level 16 audit was started, no provider
or production data was invented, and the pre-existing stash was not applied or modified.

## 1. Executive summary

Level 15 improves public residential-sale discovery and protected staff operations while
retaining the Level 14 production-readiness baseline. Public search now exposes real
availability, inventory-derived type/location choices, removable URL-backed filter chips,
and sales-only enforcement across every public property path. Detail pages add safe print
output and bounded deterministic related inventory.

The protected staff area now has real-data dashboard counts, Philippine-time upcoming
viewings and calendar/list views, publication readiness, cross-record search,
value-minimized audit review, read-only `StaffIdentity` visibility, safe current-page CSV,
contact copy controls, history timestamps, and notification/cleanup-debt visibility.
No new Level 15 mutation bypasses existing CSRF, authorization, audit, or optimistic
concurrency.

## 2. Baseline

The run began from the verified Level 14 commit above. Initial Git state was clean on
`fix/level-14-remediation`; the Level 15 branch was created directly from that commit.
Recent history, working/index diffs, and the stash list were inspected before work. There
was no existing Level 15 report or commit and no partially staged work at that baseline.

The Level 14 baseline recorded 297 passing Vitest tests, 49 passing Playwright tests, a
clean full gate, all 22 repository findings resolved, and 16 external blockers open.

## 3. Pre-implementation audit

Already correct and preserved:

- price/location/type/bed/bath filtering, numeric/range validation, deterministic sorting,
  URL state, pagination, empty/error/loading states, and public noindex policy;
- factual cards, PHP formatting, gallery/fullscreen/keyboard/swipe behavior, breadcrumbs,
  share/copy fallback, property-aware forms, and protected admin preview;
- property/inquiry pagination, permissions, CSRF/origin checks, audit events, status
  histories, optimistic concurrency, notification retries, cleanup debt, request IDs, and
  structured logging;
- Auth0/session security, location privacy, media atomicity, SEO, performance safeguards,
  deployment fail-closed behavior, and recovery controls.

Partially implemented or missing and completed here:

- public availability controls, inventory-derived filter choices, active chips, stricter
  production-visible residential-type isolation, print detail, and related inventory;
- operational dashboard/calendar, readiness feedback, cross-admin search, audit viewer,
  staff visibility, current-page CSV, contact copy, exact history times, and notification
  state visibility;
- focused Level 15 tests, new responsive/reflow coverage, and current documentation.

Audited and deliberately not implemented:

- QR, conflict-risk autosave, speculative/fuzzy duplicate warnings, bulk availability,
  staff mutation UI, provider settings, manual email retry, cleanup mutation, and orphan
  deletion UI;
- AI, accounts, favorites/compare/recently viewed, saved searches/alerts/push, rentals,
  condominiums/apartments/commercial inventory, database/auth migration, analytics,
  providers, queues, or microservices.

## 4. Public filters

- **Price:** existing inclusive PHP min/max fields and backend validation preserved.
- **Location:** free text plus real eligible facet values; no manual popularity ranking.
- **Type:** public and new-admin input restricted to house-and-lot, townhouse, and lot.
- **Availability:** available/reserved/sold added to shared request, validation, queries,
  form, map state, pagination, and chips.
- **Bedrooms/bathrooms:** existing real optional schema fields and minimum validation kept.
- **URL state:** normalized documented scalar keys remain shareable; removing a chip
  resets only pagination.
- **Chips:** readable links remove filters individually; Clear all returns to `/properties`.

Every public list/map/facet/detail/related query and viewing eligibility check now imposes
published residential sale predicates. Historical disallowed records remain isolated for
private reconciliation and require no migration.

## 5. Sorting and pagination

Newest, price ascending, and price descending remain backend-authoritative and
deterministic. The public page stays at nine records; map output stays at 200. Existing
public/admin pagination retains filter/sort state. New audit/staff/calendar/search paths
are capped at 100, 50, 200, and five-per-domain respectively.

## 6. Property cards and detail

Cards retain only real reference, PHP price, public location, residential type,
availability, and supplied facts; their purpose copy is consistently sales-only. Gallery,
badges, breadcrumbs, metadata, share/copy, and failure states were verified rather than
rewritten.

Print mode contains RC Premier Properties identity, Property number, PHP price, public
facts/location/description, approved email/phone, and canonical URL. It hides ordinary
chrome and never uses private location or admin/customer data. QR remains deferred. The
related endpoint does one current-record lookup and one maximum-12 candidate read, excludes
the current/hidden/disallowed record, and returns zero to three deterministic public cards.

## 7. Public forms

Existing field errors, summary focus, submission state, idempotency, persistence-first
success copy, and retryable errors remain. Viewing eligibility is tightened to published,
not-sold, residential sale inventory. A submitted time remains a request requiring staff
confirmation—not calendar availability.

## 8. Admin dashboard

`/admin` uses real aggregate/count queries for published/draft/unpublished,
available/reserved/sold, active/new inquiries, retry-pending/terminal notifications,
upcoming viewings, and cleanup debt. It does not invent revenue, conversion, commissions,
traffic, trends, or popularity.

## 9. Inquiry and viewing operations

New inquiry visibility is an actual `status: new` count. Upcoming records use Manila date
and time, exclude archived/terminal state, show six plus total, and expose no contact data.
The 42-day calendar returns no more than 200 schedule identifiers and includes a semantic
table, keyboard scroll region, and equivalent chronological list. It does not add an
appointment or external-calendar model.

## 10. Property administration productivity

Backend-derived readiness reports the exact existing publish requirements and blocks an
incomplete publish. New/edit type controls are residential-sales-only; legacy disallowed
records are read-only. Existing protected preview remains noindex and non-publishing.

Autosave was not added because a safe multi-staff design needs explicit conflict UX around
the current version token. Exact property number/slug duplicates remain impossible through
unique indexes; broader duplicate heuristics lack evidence. Bulk availability was not
justified because individual versioned/audited transitions are safer than new partial
failure semantics.

## 11. Cross-admin search

`/admin/search` concurrently reuses bounded protected property/inquiry APIs and returns at
most five of each. Inquiry search accepts an exact valid database ID. Broad result previews
omit names, email, phone, and message text; staff open the protected detail deliberately.

## 12. Audit viewer

`/admin/audit` requires `audit:read`, validates allowlisted action/entity/outcome/staff/date
filters, and paginates a value-minimized projection. It excludes details payloads,
customer messages, property values, private locations, tokens, cookies, and raw session
identifiers.

## 13. Staff management

`/admin/staff` uses existing `StaffIdentity` records and administrator-only `staff:manage`.
It is intentionally read-only and omits Auth0 issuer/subject/session data. Existing CLI
provision/deactivate operations remain the safe audited, session-revoking path; no
password, customer account, second identity architecture, or final-admin mutation risk was
introduced.

## 14. CSV export

Property and inquiry lists export only the already authorized current page. UTF-8 BOM,
quoted cells, and apostrophe neutralization of leading-whitespace `= + - @` values mitigate
spreadsheet formula injection. Inquiry output excludes phone, message, consent, notes,
history, and notification internals; property output excludes private location and notes.

## 15. Notification and operational controls

Authorized lists/details expose safe persisted delivery status, attempts, and available
attempt/retry/delivery times/error code. Dashboard counts expose retries, terminal
failures, and cleanup-debt volume. Stable notification IDs, leases, object references,
credentials, and customer content remain hidden. Existing bounded retry CLI and scan-only
integrity/orphan policy remain; no manual retry or destructive cleanup endpoint was added.

## 16. Database and query performance

- Dashboard: two server-side aggregations plus projected six-record upcoming read and
  counts, executed concurrently; no collections loaded to count.
- Calendar: status/date predicate, four-field projection, stable sort, `limit(201)` with
  200 returned and truncation flag.
- Related: two queries total, 12 projected candidates, three returned; no N+1.
- Search: existing server pagination, five items per domain, concurrent requests.
- Audit/staff: projected records plus counts, bounded skip/limit.

Existing indexes cover the primary property purpose/type/price, viewing status/date,
notification status, audit actor/action/time, staff status/role/email, and cleanup status
shapes. No speculative index was added. Representative Atlas `executionStats` remains X04.

## 17. Security and privacy regression

Authorization Code + S256 PKCE, state, nonce, issuer/audience/signature checks, local
issuer/subject authorization, opaque hashed sessions, timeouts/revocation/session cap,
CSRF, exact origins, credentialed CORS, proxy trust, CSP/cookies, MongoDB TLS validation,
and value-minimized errors/logs/audits remain unchanged or are reused by new routes.
All new operations routes are authenticated, permission-checked, and `no-store`.

## 18. Media and location regression

Print, CSV, dashboard, calendar, search preview, audit, related, and logs do not expose
private address, internal coordinates, or location notes. Media metadata/audit/delete
ordering, cleanup debt, provider-neutral storage, development sample isolation, production
fail-closed behavior, and no automatic orphan deletion remain intact.

## 19. SEO regression

Arbitrary filters remain noindex with stable canonical policy. Related records are fetched
only from published residential sales and do not alter sitemap inputs. Property/Product,
Offer, BreadcrumbList, robots, sharded sitemap, final-origin validation, and admin/API
noindex behavior remain covered.

## 20. Accessibility and responsive status

New UI uses labeled native controls, semantic headings/tables/lists, live status/error
regions, keyboard-focusable scroll regions, and explicit calendar alternative. Admin grid
items and table/calendar scroll containment prevent page overflow. Focused Edge coverage
passes the dashboard/calendar at 320 pixels and simulated 200% root text. The established
320–1920 public matrix remains green. Physical devices, assistive technology, forced
colors, Firefox/WebKit, and Safari/iOS remain X14.

## 21. Performance status

No dependency or heavy UI library was added. Existing LCP/Next Image, progressive gallery,
deferred Leaflet/boundaries, click-to-load YouTube, request deadlines, pagination,
projections, dynamic freshness, and no-store private data safeguards remain. New queries
are bounded and no N+1 was introduced. Field CWV/RUM remains X13.

## 22. Deployment, operations, and recovery status

Strict environment validation, TLS, same-site session topology, readiness, signal
supervision, provider fail-closed behavior, explicit operational targets, isolated restore,
and media reconciliation rules are unchanged. Repository UI visibility does not claim
provider monitoring, scheduling, backup, or recovery acceptance.

## 23. Level 14 finding revalidation

All 22 repository findings remain resolved:

| Findings    | Revalidation                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L13-H01     | MongoDB URI downgrade validation unchanged; production tests remain green.                                                                                 |
| L13-H02     | Media metadata/audit/delete ordering untouched; failure-injection suite remains green.                                                                     |
| L13-M01–M05 | Terminal schedules, sales-only writes, notification leases, bounded integrity, and inquiry references remain covered; residential eligibility is stricter. |
| L13-M06–M07 | Existing 200% public/admin session reflow and skip-focus tests pass; new dashboard/calendar 200% coverage also passes.                                     |
| L13-M08–M13 | Deadlines, callback budget, sitemap bounds, signal supervision, CI deployment gate, and env-ignore rules remain green.                                     |
| L13-L01–L07 | ESLint topology, cleanup error, catalog copy, Manila time, admin chrome, map generator, and cross-doc scope remain resolved.                               |

Specifically, TLS downgrade remains closed, media delete/audit atomicity remains safe, the
Level 14 200% fix is not regressed, and the ESLint dependency tree remains valid.

## 24. Files changed

- Shared/auth: `shared/src/api.ts`, auth constants/types.
- Public backend: property controller/routes/service/types/validation and inquiry service.
- Operations backend: new controller/routes/service/types/validation module and router
  registration.
- Public frontend: properties list/detail pages, actions/cards/search/chips, query/service,
  and responsive/print styles.
- Admin frontend: dashboard, calendar, search, audit, staff, CSV, property/inquiry
  productivity views, service, routes, shell, and responsive styles.
- Tests: backend API/validation/performance/operations, frontend query/chips/CSV/calendar,
  Playwright fixture/public/map/admin property/inquiry/operations.
- Documentation: roadmap/index, public/admin/inquiry features, public/property/inquiry/auth/
  operations APIs, architecture/resilience/models/testing, and this report.

## 25. Focused tests

- Level 15 focused Vitest: **98/98 passed** across nine files.
- Level 15 operational Playwright: **3/3 passed**, including 320px and 200% text.
- Corrected public detail slice: **13/13 passed**.

## 26. Full quality gate

Final results:

- `npm.cmd run format`: **PASS**
- `npm.cmd run format:check`: **PASS**
- `npm.cmd run lint`: **PASS**
- `npm.cmd run typecheck`: **PASS**, including fresh Next.js route type generation
- `npm.cmd test`: **311/311 passed**
- `npm.cmd run build`: **PASS**, optimized shared/backend/frontend production artifacts
- `npm.cmd run test:e2e`: **52/52 passed**
- strict staging-shaped `npm.cmd run build:deployment`: **PASS** with reserved HTTPS/map
  fixture values
- `npm.cmd ls --all`: **PASS**; platform-specific optional dependencies are correctly
  absent on Windows
- `npm.cmd audit --omit=dev --audit-level=high`: **PASS**, 0 vulnerabilities

## 27. External and live blockers

All 16 blocking items remain open because no live evidence was supplied:

| ID  | External acceptance still required                                          |
| --- | --------------------------------------------------------------------------- |
| X01 | Final domain/DNS/TLS edge, proxy count, WAF, shared multi-instance limits   |
| X02 | Controlled staging, process tree, release and rollback                      |
| X03 | Production Auth0 MFA/session/disable/recovery                               |
| X04 | Staging/production Atlas security, least privilege, cardinality/query plans |
| X05 | Atlas managed backup/PITR policy and completed backup                       |
| X06 | Isolated database restore rehearsal and measured RPO/RTO                    |
| X07 | Production object storage/CDN adapter and lifecycle                         |
| X08 | Media backup/restore and database/object reconciliation                     |
| X09 | Transactional email sender, receipt, idempotency, outage/retry evidence     |
| X10 | Licensed production map provider, attribution and quota/failure evidence    |
| X11 | Central observability, alert routing, on-call ownership/exercise            |
| X12 | Approved representative sale inventory, media and business content          |
| X13 | Production field Core Web Vitals/RUM                                        |
| X14 | Physical browser/device/picker/assistive/forced-colors acceptance           |
| X15 | Final-domain SEO/social crawler and sitemap verification                    |
| X16 | Retention/privacy/legal/purge and operational ownership approval            |

X17 branch protection remains a non-blocking repository-administrator recommendation and
was not folded into Level 15.

## 28. Documentation

The source of truth now records only implemented behavior, bounded query decisions,
security/privacy boundaries, explicit deferrals, and unchanged live gates. Level 13 and
Level 14 historical evidence was not erased or rewritten.

## 29. Git

- Starting commit: `24b87ca51ab81b6ebfc4753f96d90c2ee6e6a14c`
- Branch: `feature/product-operations-enhancements`
- Commit subject: `feat: add product and operations enhancements`
- Immutable commit hash and final worktree/index are recorded at handoff because a commit
  cannot contain its own hash.
- No merge, rebase, reset, push, or stash apply/pop/delete was performed.
- `stash@{0}` remains present and untouched.

## 30. Level 15 Definition of Done

- [x] Existing public/admin functionality audited and preserved before modification
- [x] Real price/location/type/availability/bed/bath filters and URL state verified
- [x] Active chips, Clear all, deterministic sorting, pagination, and empty states verified
- [x] Factual cards, PHP formatting, gallery, breadcrumbs, share/copy, safe print, and
      bounded real related inventory complete
- [x] QR omitted only after documented justification; public URL text remains available
- [x] Public loading/error/form behavior and sales-only viewing semantics preserved
- [x] Real bounded dashboard, new inquiries, upcoming viewings, calendar and list complete
- [x] Publication readiness and protected preview complete
- [x] Autosave, duplicate warning, and bulk availability audited and safely deferred
- [x] Bounded cross-search, audit viewer, existing-architecture staff visibility, safe CSV,
      contact copy, timestamps, and notification visibility complete
- [x] Retry and cleanup debt preserved; no destructive orphan deletion
- [x] All new list/query shapes bounded; no N+1; index decision reviewed
- [x] Optimistic concurrency, audit, structured logging, and all auth controls preserved
- [x] TLS, media atomicity, location privacy, sales-only, sample-media prohibition, SEO,
      accessibility/reflow, performance, deployment, and recovery safeguards preserved
- [x] All 16 external blockers separately retained
- [x] Final full gate, Git staging/review/commit, and clean worktree evidence recorded
- [x] Documentation and this implementation report updated
- [x] `stash@{0}` untouched; no unrelated work; Level 16 not started

## 31. Updated engineering status

Level 15 repository engineering is complete. The launch evidence score remains **82/100**
and classification remains **ENGINEERING READY — LIVE ACCEPTANCE REQUIRED**. Product
convenience does not close live infrastructure, provider, content, device, accessibility,
monitoring, backup, or recovery gates.

## 32. Recommended next step

Review and accept the Level 15 commit, then assign owners and execute X01/X02 staging and
the linked external acceptance runbooks. The separately requested next engineering phase
would be Level 16 final post-enhancement forensic audit. **Do not start Level 16
automatically.**
