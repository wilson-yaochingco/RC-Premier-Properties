# RC Premier Properties — Level 14 Forensic Audit Remediation

- **Remediation status:** Repository remediation implemented; final gate recorded below
- **Date:** 2026-09-10 (Asia/Taipei)
- **Starting commit:** `abf4868cde09d5a4806c34dd3eb810707c214d97`
- **Branch:** `fix/level-14-remediation`
- **Level 13 baseline:** **READY AFTER LEVEL 14**, 68/100
- **Updated classification:** **ENGINEERING READY — LIVE ACCEPTANCE REQUIRED**
- **Updated score:** **82/100**

This is the authoritative remediation record for the confirmed repository findings in
[`level-13-production-readiness.md`](level-13-production-readiness.md). The Level 13 audit
remains unchanged historical evidence except for a link to this document. Level 14 did not
start Level 15, migrate MongoDB, select a provider, change the product boundary, apply a
database migration, or claim live acceptance.

## 1. Executive summary

All 22 confirmed Level 13 repository findings are resolved: 0 Critical, 2 High, 13 Medium,
and 7 Low remain open. MongoDB production URI parsing now rejects explicit encryption or
certificate-validation downgrade attempts. Media compensation cannot delete an object
after its property reference commits. The remaining workflow, reliability, accessibility,
performance, deployment, dependency, hygiene, and documentation defects have deterministic
coverage.

The application is not production-ready. The same 16 production-blocking live items and
the non-blocking repository-governance follow-up remain external. No score is awarded for
unprovisioned infrastructure or unperformed acceptance.

## 2. Starting baseline

Level 14 started from the clean Level 13 audit commit
`abf4868cde09d5a4806c34dd3eb810707c214d97` on
`audit/production-readiness`. The audit recorded 68%, 0 Critical, 2 High, 13 Medium, 7 Low,
16 external blockers, one failed E2E reflow case, and an invalid ESLint peer topology.
Work continued on `fix/level-14-remediation`. The pre-existing `stash@{0}` was neither
applied nor modified.

## 3. Level 13 finding matrix

“Resolved” below means the repository defect and its regression evidence are complete. It
does not absorb the separately named live dependency.

| Finding | Severity | Status                | Remediation                                                                                                                                                                                       | Verification / residual boundary                                                                                                                 |
| ------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| L13-H01 | High     | Resolved              | Production-equivalent URI parsing requires encrypted non-local MongoDB with a database and rejects false/non-true TLS aliases, certificate/hostname bypasses, conflicts, and `sslValidate=false`. | Direct URI and production module-load cases; live Atlas path remains X04.                                                                        |
| L13-H02 | High     | Resolved              | Upload compensation is limited to pre-metadata failure. Removal orders metadata, audit, then deletion and records cleanup debt on audit/deletion failure.                                         | Failure injection covers metadata, audit, deletion, debt-write failure, persisted gallery, and no media reappearance. X07/X08 remain live.       |
| L13-M01 | Medium   | Resolved              | Completion/cancellation copy the current viewing schedule instead of caller replacements.                                                                                                         | Service history and past/changed schedule coverage.                                                                                              |
| L13-M02 | Medium   | Resolved              | Shared admin input, validation, service, publish, and UI are sales-only; legacy non-sale records are read-only and integrity-visible.                                                             | Validator/service negative cases; existing-data disposition remains an owner decision under X12/X16.                                             |
| L13-M03 | Medium   | Resolved              | New notifications persist as `sending` with an owned five-minute lease; initial result transitions require that lease.                                                                            | Controlled in-flight success/failure versus worker tests, query/index ownership, stable notification key. Live provider idempotency remains X09. |
| L13-M04 | Medium   | Resolved              | Integrity work uses bounded cursors and database duplicate/reference aggregation; `--limit` is batch size and output is capped while counts remain complete.                                      | Large-cardinality/cap tests, PII-free report checks; production-shaped Atlas run remains X04.                                                    |
| L13-M05 | Medium   | Resolved              | Every supplied inquiry `propertyId` must resolve; viewing adds published-sale/not-sold eligibility.                                                                                               | Non-viewing missing-reference and viewing/repository cases.                                                                                      |
| L13-M06 | Medium   | Resolved              | Header/footer grids shrink and wrap; clipping suppression was removed.                                                                                                                            | All public routes and admin states at 200% text, width/offender and sibling-overlap assertions. Physical zoom remains X14.                       |
| L13-M07 | Medium   | Resolved              | Every conditional admin `main#main-content` is programmatically focusable.                                                                                                                        | Loading, 401, network-error, and authenticated skip-link tests. Screen-reader acceptance remains X14.                                            |
| L13-M08 | Medium   | Resolved              | MongoDB, HTTP, generic API, public read/map, session/admin/inquiry, and upload paths have bounded deadlines with caller abort preserved.                                                          | Fake stalled-request and cancellation cases; host timeout alignment remains X01/X02.                                                             |
| L13-M09 | Medium   | Resolved (repository) | OIDC callback failures have a separate generic, success-skipping failure budget.                                                                                                                  | Callback burst/enumeration/isolation tests. Shared multi-instance enforcement remains explicitly X01.                                            |
| L13-M10 | Medium   | Resolved              | `/sitemap.xml` is a one-read index; stable shards fetch at most 20 API pages in batches of four.                                                                                                  | High totals, request budget, 960-record shape, escaped index, isolated later-shard failure, and E2E output. X15 remains live.                    |
| L13-M11 | Medium   | Resolved (repository) | The wrapper directly supervises Next, forwards SIGINT/SIGTERM once, waits, then force-stops after a bound.                                                                                        | Deterministic forwarding/cleanup tests; Linux/container/host acceptance remains X02.                                                             |
| L13-M12 | Medium   | Resolved              | CI validates `npm ls`, high-severity production audit, and a secret-free strict staging-shaped deployment build.                                                                                  | Workflow review plus local equivalent commands; remote CI is not claimed.                                                                        |
| L13-M13 | Medium   | Resolved              | Root `.env*` ignores cover every workspace while all `.env.example` templates remain trackable.                                                                                                   | `git check-ignore --no-index` matrix.                                                                                                            |
| L13-L01 | Low      | Resolved              | Backend ESLint and `@eslint/js` align with the supported ESLint 9 topology.                                                                                                                       | Clean root install, lint, and `npm ls --all`.                                                                                                    |
| L13-L02 | Low      | Resolved              | Failed local transformation compensation reports `transformation_cleanup_failed` instead of discarding removal failures.                                                                          | Injected transform plus filesystem cleanup failure.                                                                                              |
| L13-L03 | Low      | Resolved              | Catalog error boundary uses catalog-specific copy.                                                                                                                                                | Route-source regression assertion.                                                                                                               |
| L13-L04 | Low      | Resolved              | Business timestamps use `Asia/Manila` and ISO `<time dateTime>` instants.                                                                                                                         | UTC/Manila midnight-boundary formatting test and semantic markup review.                                                                         |
| L13-L05 | Low      | Resolved              | Public chrome is suppressed only for `/admin` and `/admin/…`.                                                                                                                                     | `/administrator` public-chrome E2E regression.                                                                                                   |
| L13-L06 | Low      | Resolved              | Obsolete alternate-output map generator was deleted; one documented generator remains.                                                                                                            | Generator output-path plus 22-feature/provenance artifact tests.                                                                                 |
| L13-L07 | Low      | Resolved              | Contributor scope, README, roadmap, architecture, API, operations, testing, and audit index now distinguish implemented repository behavior from live/provider blocks.                            | Cross-document/source reconciliation and link/format gate.                                                                                       |

## 4. High finding 1 — MongoDB TLS downgrade

The old validator treated `mongodb+srv` as encrypted without checking explicit query
options and accepted any standard URI if either alias said true. The new parser normalizes
reviewed option names and rejects any explicit enable value other than `true`, insecure
certificate/hostname values other than `false`, and `sslValidate` other than `true`.
Existing non-local, explicit-database, scheme, and production-equivalent staging behavior
remain fail closed. Development/test can still use loopback MongoDB.

## 5. High finding 2 — media deletion/audit atomicity

The upload path previously placed metadata persistence and audit insertion in one catch,
so an audit-only failure deleted the newly referenced object. The failure scopes are now
separate. Only pre-commit metadata failure compensates storage. After commit, audit failure
is logged and surfaced without deleting referenced media.

For removal, MongoDB first commits the requested gallery/cover state, then the minimized
audit commits, then owned storage is deleted. An audit failure retains the unreferenced
object as cleanup debt; a delete failure also records debt. Neither path restores removed
metadata or performs automatic orphan deletion.

## 6. Accessibility remediation

Desktop header/footer grids retained rem minimums at 200% text, while body overflow hiding
masked clipped content. Tracks now permit shrinking, navigation wraps, the sticky header
can grow, long footer content wraps, and body clipping is removed. Production-build Edge
coverage checks every core public route and all admin session states at 200% text for
document width and visible overflow; header/footer siblings are checked for overlap.

## 7. Dependency topology

The backend mixed ESLint 10 with a root/frontend ESLint 9 ecosystem. Only backend
`eslint` and `@eslint/js` were aligned to `^9.39.5`; no force, legacy-peer bypass, rule
weakening, or unrelated upgrade was used. The lockfile was regenerated from the root.
Final clean-install topology and vulnerability results are in section 20.
`npm ci` emits npm's non-failing notice that ESLint 9 is deprecated upstream; ESLint 10
cannot be adopted safely while the installed Next lint-plugin peer ranges still stop at 9. The selected version is the single valid peer-compatible topology, and this notice is
not an invalid tree or vulnerability.

## 8. Medium findings

All 13 Medium findings are resolved at their repository boundary. M09 retains shared
multi-instance enforcement as X01 rather than inventing a store. M11 retains real
Linux/container shutdown acceptance as X02. Atlas cardinality, provider idempotency,
physical reflow/accessibility, and live crawler checks remain X04, X09, X14, and X15.

## 9. Low findings

All seven Low findings were safe and bounded, so none is accepted as residual repository
risk. Fixes cover lint topology, explicit local cleanup failure, accurate catalog copy,
business timezone semantics, exact admin path segmentation, one map generator, and current
scope/status documentation.

## 10. Security regression status

Existing tests revalidate Authorization Code + PKCE, state, nonce, issuer/audience and
signature/expiry validation, exact local issuer/subject authorization, HMAC-only opaque
session storage, idle/absolute expiry, rotation/revocation/concurrent-session limits,
secure cookie policy, CSRF/exact Origin, CORS, explicit proxy depth, CSP/HSTS, private
projections, MongoDB TLS, generic authentication errors, and value-minimized audit/logs.
No security boundary was weakened.

## 11. Functional regression status

The sales property lifecycle remains draft/published/unpublished/archived with
available/reserved/sold, recoverable archive, non-publishing restore, and optimistic
concurrency. Inquiry persistence remains authoritative with consent, normalization,
honeypot, public idempotency, notes/history, spam/archive, and post-persistence
notification. Viewing requests remain Philippine-time requests—not calendar appointments—
with eligibility, terminality, synchronization, permissions, and version checks.

## 12. Media and location regression status

The 24-image maximum, stable IDs, order, cover, alt/caption, focal points, provenance,
portrait/fullscreen behavior, validation, sample prohibition, provider-neutral adapters,
cleanup debt, and production fail-closed storage remain intact. Public DTOs, maps, SEO,
logs, errors, and audits still omit private addresses, exact internal coordinates, and
private notes.

## 13. SEO regression status

Canonical safety, production-origin refusal, robots, admin/API/filter noindex, Product and
Offer schema, Organization/WebSite, breadcrumbs, safe image selection, and sales-only
public filtering remain covered. The sitemap is now bounded and sharded without widening
its public data input.

## 14. Accessibility and responsive status

Automated coverage remains green for landmarks, heading hierarchy, skip links, focus,
dialogs, keyboard gallery, form errors, status regions, reduced motion, upload manager,
map fallback, viewport overflow, 200% text, and admin conditional states. No physical
screen-reader, forced-colors, device, Safari/iOS, Firefox/WebKit, or picker acceptance is
claimed; X14 remains blocking.

## 15. Performance status

No heavy dependency was added. Responsive images, current-image gallery loading,
click-to-load YouTube, deferred Leaflet/boundaries, pagination, projections,
request-scoped deduplication, private no-store, and dynamic inventory freshness remain.
Sitemap and integrity memory/query shapes are now bounded. Field CWV/RUM remains X13.

## 16. Deployment status

Same-site topology, strict environment/build gates, readiness, backend graceful shutdown,
Auth0 callback pinning, explicit proxy trust, CSP, origin validation, and provider
fail-closed behavior remain. MongoDB configuration is stricter. Frontend child-process
signal forwarding and CI deployment-shape checks are repository-complete; host acceptance
remains X01/X02.

## 17. Operations, backup, and recovery status

Notification retries remain durable, leased, bounded, provider-disabled fail closed, and
free of an in-process scheduler. Integrity remains scan-only and explicit-target. Restore
isolation, production confirmation, backup-artifact exclusion, media reconciliation,
session reauthentication, and no-unsafe-cleanup policies are unchanged. Actual providers,
alerts, backup/PITR, and restore rehearsal remain X05/X06/X08/X11.

## 18. Files changed

- Security/config/CI: MongoDB environment parsing, deadlines, callback limiter, env-ignore
  rules, workflow, ESLint manifests/lockfile.
- Inquiry/property/operations: notification lease, relational references, terminal
  viewing schedule, sales-only admin contract, media ordering/cleanup, streaming integrity.
- Frontend/deployment: API/map/upload deadlines, sitemap index/shards, reflow CSS, admin
  focus, timezone markup, exact admin chrome, process signal supervisor, catalog copy.
- Tests: deterministic backend/frontend unit and integration coverage plus production-build
  Playwright regressions.
- Documentation: contributor/readme/roadmap, API, architecture, features, development,
  historical audit link, and this remediation record.

## 19. Focused tests

Focused Vitest suites cover both High findings and all changed Medium/Low boundaries.
Focused production-build Playwright checks cover sitemap output, 200% public/admin reflow,
admin skip-link states, and the admin-prefix 404. Result: **PASS**; the final full suites
supersede the focused run with 297 Vitest tests and 49 Playwright tests.

## 20. Full quality gate

| Gate                                                 | Result                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Clean root `npm ci`                                  | PASS — 515 packages installed; full install audit found 0 vulnerabilities |
| `npm.cmd run format:check`                           | PASS                                                                      |
| `npm.cmd run lint`                                   | PASS — backend and frontend                                               |
| `npm.cmd run typecheck`                              | PASS — shared, backend, frontend with fresh route types                   |
| `npm.cmd test`                                       | PASS — 28 files, 297 tests                                                |
| `npm.cmd run build`                                  | PASS — shared, backend, optimized Next build                              |
| `npm.cmd run test:e2e`                               | PASS — 49/49, production-build Microsoft Edge                             |
| Strict staging-shaped `npm.cmd run build:deployment` | PASS — reserved `staging` with synthetic safe HTTPS origins               |
| `npm.cmd ls --all`                                   | PASS — exit 0, no invalid peer/dependency topology                        |
| `npm.cmd audit --omit=dev --audit-level=high`        | PASS — 0 vulnerabilities                                                  |
| `git diff --check`                                   | PASS                                                                      |

## 21. Level 13 revalidation

- **Unresolved Critical:** 0
- **Unresolved High:** 0
- **Unresolved Medium:** 0
- **Unresolved Low:** 0
- **Accepted repository residuals:** 0
- **Repository findings reclassified as external:** none; M09/M11 repository portions are
  fixed while their previously documented live acceptance remains external

The complete Level 13 document and its finding directions were re-read after
implementation. The matrix in section 3 records the evidence and residual boundary for
every confirmed finding.

## 22. External and live blockers

All 16 Level 13 blockers remain production-blocking:

| ID  | Retained live requirement                                                       |
| --- | ------------------------------------------------------------------------------- |
| X01 | Final domain/DNS/TLS edge, proxy count, WAF, shared multi-instance limits       |
| X02 | Controlled staging deployment, process-tree behavior, release/rollback          |
| X03 | Production Auth0 MFA/session/disable/recovery acceptance                        |
| X04 | Staging/production Atlas security, least privilege, cardinality/query plans     |
| X05 | Atlas managed backup/PITR policy and completed backup evidence                  |
| X06 | Isolated database restore rehearsal and measured RPO/RTO                        |
| X07 | Production object storage/CDN adapter, ownership, version/lifecycle behavior    |
| X08 | Media backup/restore and database/object reconciliation                         |
| X09 | Transactional email, sender/domain, receipt, idempotency, outage/retry evidence |
| X10 | Licensed production map provider, attribution, quota/failure evidence           |
| X11 | Central logs/errors/uptime/RUM, alert routing, on-call ownership/exercise       |
| X12 | Approved representative sale inventory, listing media, and business content     |
| X13 | Production field Core Web Vitals and RUM observation                            |
| X14 | Physical browser/device/upload-picker/screen-reader/forced-colors acceptance    |
| X15 | Final-domain SEO/social crawler and sitemap-shard verification                  |
| X16 | Retention, privacy/legal, purge, and named operational ownership approval       |

X17, main-branch protection/required checks, remains the same non-blocking but recommended
repository-administrator follow-up. This remediation made no external account, provider,
deployment, database, email, or repository-setting change.

## 23. Updated launch readiness

| Category                 |        Score | Remaining deduction                                                   |
| ------------------------ | -----------: | --------------------------------------------------------------------- |
| Core functionality       |      13 / 15 | No representative inventory or live staff workflow acceptance         |
| Security/auth/privacy    |      13 / 15 | Production Auth0/edge/shared enforcement not accepted                 |
| Data integrity           |      10 / 12 | No production-shaped Atlas/retention evidence                         |
| Media/location           |        6 / 8 | Production storage/media recovery/map and representative media absent |
| SEO/social               |        6 / 7 | Final-domain crawler acceptance absent                                |
| Accessibility/responsive |        7 / 8 | Physical device/assistive acceptance absent                           |
| Performance              |        7 / 8 | Field CWV/RUM absent                                                  |
| Deployment               |        6 / 8 | No real staging host/proxy/release/rollback evidence                  |
| Monitoring/operations    |        5 / 7 | No live aggregation, alerts, scheduler, or on-call exercise           |
| Backup/recovery          |        2 / 5 | No configured backup/PITR or restore/media rehearsal                  |
| Documentation/testing    |        7 / 7 | Repository documentation and local gates complete                     |
| **Overall**              | **82 / 100** | **Repository findings resolved; 16 live gates remain**                |

This is an evidence score, not a launch probability. It rises from 68 because repository
defects and gates were corrected, not because any live infrastructure was assumed.

## 24. Updated launch classification

**ENGINEERING READY — LIVE ACCEPTANCE REQUIRED.** It is not “Ready for controlled staging”
because controlled staging itself is X02, and it is not “Ready for production” while any
blocking live item lacks evidence.

## 25. Documentation

The original audit is preserved with a forward reference. Scope and status documents now
distinguish implemented admin/media/notification behavior from provider and live gates.
API and architecture documents record sales-only writes, reference semantics, terminal
schedule preservation, audit/media ordering, initial notification ownership, bounded
integrity/deadline policy, callback topology, sharded SEO, and signal supervision.

## 26. Git

- **Starting commit:** `abf4868cde09d5a4806c34dd3eb810707c214d97`
- **Branch:** `fix/level-14-remediation`
- **Commit:** the commit containing this record uses subject
  `fix: remediate production readiness findings`; immutable hash is reported at handoff
- **History operations:** no merge, rebase, reset, push, or stash apply/pop
- **Stash:** `stash@{0}` must remain object
  `e3070251f4c5530abd4d2a2410365ab2a0789c2a`
- **Final worktree:** required clean after the reviewed commit; final handoff records the
  observed state

## 27. Level 14 Definition of Done

- [x] Complete Level 13 audit read and all repository findings classified
- [x] Both High, all 13 Medium, and all 7 Low findings resolved
- [x] No Critical finding introduced and no accepted repository residual
- [x] Security, auth/session, lifecycle, inquiry, viewing, media, location privacy,
      sales-only, SEO, accessibility, performance, deployment, logging, and recovery
      boundaries preserved or strengthened
- [x] Dependency topology and vulnerability policy corrected
- [x] Focused regressions added
- [x] Original Level 13 audit preserved and external blockers retained
- [x] Launch readiness recalculated without live-infrastructure credit
- [x] No Level 15 feature, provider invention, database migration, or stash mutation
- [x] Final clean full gate passed; reviewed commit and clean state are reported at handoff

## 28. Recommended next step

Stop after Level 14. Once this commit is reviewed, the next action is external X01/X02
ownership and a controlled staging plan using the existing runbooks. Level 15 may be
considered only after this repository remediation is accepted; it is not started here.
