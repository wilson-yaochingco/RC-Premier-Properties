# RC Premier Properties — Level 17 Final Production Readiness Remediation

- **Remediation status:** Complete
- **Date:** 2026-09-10 (Asia/Taipei)
- **Starting commit:** `089c3da6dc4c6a7162ab3882a39a320e5b4cecdf`
- **Branch:** `fix/level-17-final-remediation`
- **Repository findings:** 22 resolved; 0 confirmed remaining
- **External/live blockers:** X01–X16 remain open
- **Classification:** **ENGINEERING READY — LIVE ACCEPTANCE REQUIRED**

This report closes only the repository findings from the
[Level 16 audit](level-16-final-production-readiness.md). It does not claim a production
deployment, live provider, real-data, physical-device, recovery, legal, or business-owner
acceptance result. The public MVP boundary is unchanged.

## Finding disposition

| ID      | Status   | Remediation and evidence                                                                                                                                                                                                                                                                                 |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L16-H01 | RESOLVED | Media compensation and removal reconcile gallery and cover references across all properties before physical deletion. Uncertain commit and legacy cross-property-reference tests retain the object; metadata-only edits cannot claim a new managed URL; audit and cleanup-debt ordering remains covered. |
| L16-M01 | RESOLVED | Duplicate scans use `$setWindowFields` counts and emit one ID per row, with no per-key `$push` array. Existing complete counts and 500-item serialized finding bounds remain intact.                                                                                                                     |
| L16-M02 | RESOLVED | The shared inquiry notification contract has an explicit `untracked` legacy state. List/detail UI, retry/dashboard semantics, minimized search, CSV omission, and integrity warnings no longer invent pending work.                                                                                      |
| L16-M03 | RESOLVED | Missing inquiry and viewing histories remain empty, the detail UI labels them unavailable, and the integrity scan reports both missing-history conditions instead of synthesizing transitions at creation time.                                                                                          |
| L16-M04 | RESOLVED | Audit date filters now represent inclusive Philippine calendar dates and the backend converts them to exact `+08:00` instant bounds. Boundary assertions cover both ends of a Manila day.                                                                                                                |
| L16-M05 | RESOLVED | Premier Property numbers are immutable after creation and slugs are immutable after first publication, including later unpublished edits. Backend enforcement, read-only form state, publication/incomplete-publication, collision, and concurrency coverage remain green.                               |
| L16-M06 | RESOLVED | Related inventory renders inside an independently recoverable `Suspense` boundary. An eight-second related read no longer withholds the primary property detail response, and failures resolve to no fabricated fallback.                                                                                |
| L16-M07 | RESOLVED | Trusted callers may supply a validated page size up to 48; the sitemap calls the real service serializer with 48 rather than a browser-controlled limit. Shard budgets, 960-item shape, concurrency, and failure isolation remain covered.                                                               |
| L16-M08 | RESOLVED | The viewing calendar API returns bounded 200-record pages with total metadata and deterministic schedule ordering. Accessible UI pagination makes records beyond the first page reachable and describes overflow truthfully.                                                                             |
| L16-M09 | RESOLVED | Public location facets are restricted and database-limited to the canonical 22 Pampanga areas. The unbounded location accumulator was removed, bounding API, homepage, and sitemap consumption.                                                                                                          |
| L16-L01 | RESOLVED | One array-aware normalizer preserves repeated browser parameters so SSR, hydrated list/map state, chips, and navigation consistently choose the first scalar value. Every supported repeatable filter has direct regression coverage.                                                                    |
| L16-L02 | RESOLVED | Native share and clipboard fallback receive the clean server-owned canonical property URL, excluding inbound filter, `from`, tracking, and unknown state. Both paths assert the exact URL.                                                                                                               |
| L16-L03 | RESOLVED | A positive-total request beyond the last page redirects to the last real filtered page rather than presenting a false no-match result. Browser and SEO navigation assertions wait for the recovered state.                                                                                               |
| L16-L04 | RESOLVED | Legacy clipboard fallback records the active element and restores focus in a `finally` block. Browser coverage proves focus retention for successful and failed copy operations.                                                                                                                         |
| L16-L05 | RESOLVED | Cross-admin inquiry search uses a dedicated authenticated, bounded endpoint and database projection containing only inquiry ID, type, status, and optional Premier Property number. HTTP and browser assertions exclude identity and contact values.                                                     |
| L16-L06 | RESOLVED | The audit viewer exposes a validated Staff ID filter. Browser coverage proves apply, pagination retention, and clearing/reset; malformed identifiers return a safe `400` before service work.                                                                                                            |
| L16-L07 | RESOLVED | `/admin/viewings` owns a page-level `h1` before the calendar and inquiry list; child regions use ordered section headings. Responsive browser coverage includes the resulting outline.                                                                                                                   |
| L16-L08 | RESOLVED | Inquiry detail renders `deliveredAt` only when persisted and labels all displayed instants with the existing Philippine-time formatter. Untracked/pending/retry states show only applicable facts.                                                                                                       |
| L16-L09 | RESOLVED | Dashboard requests pass through a no-query parser before aggregation. Unknown scalar, repeated, and object-shaped queries all return `400` without an extra service call.                                                                                                                                |
| L16-L10 | RESOLVED | Supertest now mounts the real operations router and proves fail-closed `503`, anonymous `401`, named and dual-permission `403`, private headers, successful reads, and malformed-query rejection before service work.                                                                                    |
| L16-L11 | RESOLVED | The roadmap distinguishes the implemented deterministic related-property baseline from deferred personalized/model-assisted recommendations and assigned-agent scope.                                                                                                                                    |
| L16-L12 | RESOLVED | Audit serialization omits `entityId` for every session event while retaining allowed non-session entity identifiers and other value-minimized context. Tests prove the internal session identifier is absent.                                                                                            |

## Complete quality gate

| Gate                                             | Final result                                                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                           | PASS                                                                                                                                                      |
| `npm run lint`                                   | PASS — backend and frontend                                                                                                                               |
| `npm run typecheck`                              | PASS — shared, backend, and frontend after Next route type generation                                                                                     |
| `npm test`                                       | PASS — 34 files, 342/342 tests                                                                                                                            |
| `npm run build`                                  | PASS — shared, backend, and optimized frontend; 17 generated pages/routes                                                                                 |
| Strict staging-shaped `npm run build:deployment` | PASS with reserved synthetic HTTPS API/site/media/map settings; 17 generated pages/routes                                                                 |
| `npm run test:e2e`                               | PASS — 56/56 Playwright tests in Microsoft Edge                                                                                                           |
| Responsive/reflow coverage                       | PASS — 320, 360, 375, 390, 412, 414, 430, 480, 640, 768, 820, 1024, 1280, 1366, 1440, 1600, and 1920 px; representative 200% root text and reduced motion |
| `npm ls --all`                                   | PASS — valid dependency topology; platform-specific optional packages are expectedly absent on Windows                                                    |
| `npm audit --omit=dev --audit-level=high`        | PASS — live registry response, 0 vulnerabilities                                                                                                          |

The previously reported 137/137 focused Level 17 regression run and its browser cases
remain preserved. The final complete runs above are broader. During final verification,
an ambiguous browser-test selector and an SEO assertion racing the intentional page
recovery navigation were corrected; targeted reruns passed 22/22 Vitest assertions and
20/20 Playwright tests before the complete suites passed.

Expected fixture-only invalid-image messages and deliberate `401`/`404`/`503` failure-path
logs appeared during Playwright. They did not fail the suite or represent production-media
acceptance.

## External/live acceptance gates

All mandatory external gates remain open and are unchanged in meaning:

| ID  | Status | Required evidence                                                                  |
| --- | ------ | ---------------------------------------------------------------------------------- |
| X01 | OPEN   | Final domains, DNS, HTTPS edge, proxy count, WAF/shared-limit acceptance           |
| X02 | OPEN   | Controlled staging deployment, smoke evidence, rollback, and clean redeploy        |
| X03 | OPEN   | Production Auth0, MFA, session, logout, disable, and recovery acceptance           |
| X04 | OPEN   | Atlas security, least privilege, index inventory, and representative query plans   |
| X05 | OPEN   | Configured Atlas backup/PITR policy and completed backup evidence                  |
| X06 | OPEN   | Timed isolated database restore rehearsal with integrity validation                |
| X07 | OPEN   | Production object storage/CDN adapter and lifecycle acceptance                     |
| X08 | OPEN   | Media backup/restore and database-object reconciliation rehearsal                  |
| X09 | OPEN   | Transactional email provider and delivery/retry/outage acceptance                  |
| X10 | OPEN   | Licensed production map provider, attribution, quota, and fallback acceptance      |
| X11 | OPEN   | Central observability, alerts, routing, on-call ownership, and incident exercise   |
| X12 | OPEN   | Approved representative production inventory, media, and content                   |
| X13 | OPEN   | Field Core Web Vitals and real-user monitoring evidence                            |
| X14 | OPEN   | Physical browser, device, zoom, forced-colors, and assistive-technology acceptance |
| X15 | OPEN   | Final-domain SEO/social crawler fetch and render acceptance                        |
| X16 | OPEN   | Approved retention/privacy/legal policy, purge rehearsal, and named ownership      |

X17 branch-protection governance remains recommended and non-blocking, as recorded in
Level 16.

## Final assessment

No confirmed repository defect from H01, M01–M09, or L01–L12 remains. The repository is
safe to begin the separately scoped Figma frontend rebuild from this remediated baseline.
It is not production-ready: deployment and launch remain blocked until X01–X16 have real,
retained acceptance evidence.

The immutable remediation commit hash is reported in the handoff because a commit cannot
truthfully contain its own hash.
