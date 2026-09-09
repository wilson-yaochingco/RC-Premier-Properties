# RC Premier Properties — Level 13 Forensic Production-Readiness Audit

- **Audit status:** Complete
- **Audit date:** 2026-09-09 (Asia/Taipei)
- **Baseline commit:** `42397ca chore: add monitoring backup and recovery safeguards`
- **Audit branch:** `audit/production-readiness`
- **Final classification:** **READY AFTER LEVEL 14**
- **Launch-readiness score:** **68%**

This is the authoritative Level 13 repository audit and external/live acceptance matrix.
It audits the public MVP and staff administration capabilities that exist at the baseline;
it does not expand the product boundary. No application defect was remediated, no Level 14
work was started, and no Level 15 feature was added.

## 1. Executive summary

The repository contains a substantial, coherent public and staff vertical slice. Public
property visibility is restricted to published sale inventory, inquiry persistence is the
source of truth, viewing requests have an explicit staff lifecycle, administrative routes
use server-side authentication and named permissions, private location fields are omitted
from public DTOs, and deployment/operations documentation generally distinguishes code
from live-provider acceptance.

Level 13 nevertheless confirmed repository defects that prevent an engineering-ready or
production-ready classification:

- **Critical:** 0
- **High:** 2
- **Medium:** 13
- **Low:** 7
- **Informational observations:** 7
- **External/live production blockers:** 16, plus one non-blocking repository-governance
  follow-up

The two High findings are independently launch-blocking. Production MongoDB URI validation
accepts an SRV URI that explicitly disables TLS, and the image-upload compensation path can
delete a successfully persisted media object when only the subsequent audit insertion
fails. Important Medium findings affect viewing-history integrity, the sales-only admin
boundary, notification concurrency, integrity-scan scale and semantics, 200% text reflow,
I/O deadlines, rate limiting, sitemap growth, deployment shutdown, CI enforcement, and
credential-file hygiene.

The ordinary format, lint, typecheck, unit/integration test, build, strict deployment-build,
and vulnerability-audit checks passed. The full browser gate did not: 45 of 46 Playwright
tests passed and the homepage exceeded the viewport at 200% root text size. Focused repeats
later passed, but the CSS has deterministic minimum-width pressure and the failed full-gate
artifact identified the overflowing footer, so the full gate remains recorded as failed.
`npm ls --all` also reports an invalid ESLint peer topology even though both lint jobs run.

The application is therefore **READY AFTER LEVEL 14**, not ready for staging acceptance or
production. Level 14 should remediate and regression-test the repository findings below.
Live acceptance remains a separate subsequent gate; this audit does not select providers,
deploy infrastructure, or claim evidence that does not exist.

## 2. Audit baseline

| Item                            | Verified state                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Starting branch                 | `feature/monitoring-backup-recovery`                                                  |
| Starting/current baseline       | `42397ca chore: add monitoring backup and recovery safeguards`                        |
| Dedicated audit branch          | `audit/production-readiness`, created directly from `42397ca`                         |
| Initial worktree                | Clean; no tracked or untracked changes                                                |
| Recent history                  | `42397ca`, `f3b96b4`, `d6bf6bb`, `4d3f69f`, `50d9975`                                 |
| Tags                            | None                                                                                  |
| Stash                           | `stash@{0}: On feature/property-media-system: local package-lock change`              |
| Stash object                    | `e3070251f4c5530abd4d2a2410365ab2a0789c2a` before and after audit work                |
| Lockfiles                       | One root `package-lock.json`; no package-local lockfile                               |
| Workspaces                      | `shared`, `backend`, `frontend`                                                       |
| Runtime used for local evidence | Node `v24.19.0`, npm `11.17.0`, Windows/PowerShell                                    |
| Existing Level 13 document      | None was present at the baseline; this file is the first persistent Level 13 artifact |

Levels 1–12 and their commits were preserved. Generated build, coverage, Playwright,
backup, recovery, log, local-media, and dependency directories were not tracked. The only
tracked environment-related files were the two `.env.example` templates and environment
validation source/tests. A real ignored `backend/.env` was detected by filename only; its
contents were never read or printed.

## 3. Scope and methodology

The audit used repository evidence, not implementation assumptions:

1. Inspected Git history, branch, status, tags, stash, ignored files, tracked artifacts,
   workspaces, lockfile, roadmap, and documentation index.
2. Searched tracked current and historical content for credential categories without
   printing candidate values. Reviewed environment, backup, media, and generated-artifact
   exclusions.
3. Audited dependency declarations, installed dependency topology, lockfile state, and the
   npm vulnerability database. No packages were upgraded.
4. Traced frontend routes, layouts, fetch boundaries, public/admin chrome, error/loading
   states, metadata, robots, sitemap, structured data, images, maps, and responsive CSS.
5. Traced Express composition, environment validation, database lifecycle, public/private
   DTO projections, validation, persistence, authentication, sessions, authorization,
   CSRF/origin enforcement, rate limiting, notification retries, media cleanup, integrity
   tooling, logging, health, readiness, and graceful shutdown.
6. Cross-checked property, inquiry, viewing, media, location, notification, deployment,
   operations, recovery, accessibility, performance, SEO, and testing documentation
   against source behavior.
7. Ran the complete repository quality gate, a strict deployment build with reserved safe
   values, dependency/security tooling, and focused browser rechecks. Failures were kept as
   evidence; no test or application code was changed.
8. Grouped findings by root cause, separated repository defects from unavailable live
   evidence, severity-ranked confirmed defects, and produced a non-executed Level 14 plan.

`CONFIRMED` means directly demonstrated by source behavior, command output, or a test
artifact. `EXTERNAL / UNVERIFIED` means the repository may define a sound boundary but the
required provider, infrastructure, business input, or physical acceptance evidence was not
available. Severity follows the Level 13 model and is not an estimate of remediation effort.

## 4. Quality-gate results

| Check                      | Result                        | Evidence                                                                                                                                                                                                                                                              |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run format:check` | **PASS**                      | All repository files were formatted before the audit document was added. The two audit/documentation files receive a focused final Prettier check.                                                                                                                    |
| `npm.cmd run lint`         | **PASS**                      | Shared root command completed for backend and frontend.                                                                                                                                                                                                               |
| `npm.cmd run typecheck`    | **PASS**                      | All workspaces passed; frontend ran `next typegen` before `tsc --noEmit`.                                                                                                                                                                                             |
| `npm.cmd test`             | **PASS**                      | 22 test files, 264 tests.                                                                                                                                                                                                                                             |
| `npm.cmd run build`        | **PASS**                      | Shared, backend, and Next.js 16.3.3 production builds completed; 14 frontend routes were generated.                                                                                                                                                                   |
| `npm.cmd run test:e2e`     | **FAIL**                      | 45 passed, 1 failed. `e2e/accessibility-and-responsive.spec.ts:119` found homepage width about 1,523 px at a 1,280 px viewport under 200% text sizing. Focused reruns passed, so detection is timing/font-sensitive, but the captured CSS overflow remains confirmed. |
| Strict deployment build    | **PASS**                      | `npm.cmd run build:deployment` passed with `NEXT_PUBLIC_DEPLOYMENT_ENV=staging` and reserved HTTPS/map values; no real provider or deployment was claimed.                                                                                                            |
| `npm.cmd audit --json`     | **PASS**                      | 0 known vulnerabilities: 0 Critical, High, Moderate, Low, or Info; 661 dependencies reported (126 production, 500 development, 139 optional). The initial sandbox network denial was environmental; the approved network rerun supplied the result.                   |
| `npm.cmd ls --all --json`  | **FAIL**                      | `ELSPROBLEMS`: root `eslint@9.39.5` is invalid against hoisted `@eslint/js@10.0.1` while the backend has nested ESLint 10.9.1. This is L13-L01, not a runtime vulnerability.                                                                                          |
| Secret/credential scan     | **PASS with hygiene finding** | No private-key headers, common API tokens, JWT-like secrets, or tracked real env files were found. Documented examples/placeholders were distinguishable. Backend environment-specific filenames are insufficiently ignored (L13-M13).                                |
| Disabled/focused test scan | **PASS**                      | No committed test `.only`, `.skip`, or `.todo` calls were found.                                                                                                                                                                                                      |
| Tracked-artifact scan      | **PASS**                      | No tracked dependencies, builds, coverage, test results, logs, database dumps, backup/recovery output, or local media stores were found.                                                                                                                              |

The quality gate was actually run. A failed gate is not converted to a pass because a
focused repeat passes, and a clean vulnerability report is not treated as proof that the
installed dependency tree is healthy.

## 5. Critical findings

**None.** No authentication bypass, unauthorized private-data exposure, committed secret,
destructive production-wide corruption path, or catastrophic whole-system failure was
confirmed.

## 6. High findings

### L13-H01 — Production MongoDB TLS validation permits explicit downgrade

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/config/env.ts:211-237`; missing negative cases in
  `backend/test/env.test.ts:66-86`
- **Root cause:** `mongodb+srv:` is considered encrypted solely from its scheme. The
  validator does not reject `tls=false`, `ssl=false`, or contradictory TLS parameters.
- **Impact:** A production URI such as an SRV connection with `?tls=false` passes the
  repository's fail-closed validation even though it explicitly requests an unencrypted
  connection. This is an unsafe security configuration and contradicts the production
  environment contract.
- **Reproduction:** Call `validateMongoDbUri("production", <non-local SRV URI with an
explicit database and tls=false>)`; the current branch returns the value instead of
  throwing.
- **Level 14 direction:** Reject any explicit false TLS/SSL value, reject conflicting
  aliases/options, retain the non-local and explicit-database checks, and add production
  environment negative tests.

### L13-H02 — Audit failure can delete media after metadata persistence succeeds

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/modules/properties/property.service.ts:1028-1134`, especially
  the shared `try/catch` around `repository.updateMedia` and `audit.recordAudit`
- **Root cause:** The upload service treats metadata persistence and the subsequent audit
  insertion as one failure scope. If metadata commits and only the audit insert fails, the
  catch path removes the newly uploaded owned object as though metadata had failed.
- **Impact:** MongoDB retains a gallery/cover URL whose object has been deleted. The request
  fails after committing an inconsistent property record, breaking media persistence and
  the documented separate-write audit behavior.
- **Reproduction:** Inject a repository whose `updateMedia` succeeds and an audit recorder
  that throws. The service calls `mediaStorage.remove(stored.url)` even though the returned
  persisted gallery already references that URL.
- **Level 14 direction:** Limit storage compensation to failures before metadata commit.
  Handle post-commit audit failure under the documented audit failure policy without
  deleting referenced media; add failure-injection regression coverage.

## 7. Medium findings

### L13-M01 — Terminal viewing transitions can rewrite the recorded schedule

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/modules/inquiries/inquiry.validation.ts:477-513`,
  `backend/src/modules/inquiries/inquiry.service.ts:633-674`, and
  `docs/api/inquiry-administration-api.md:44-47`
- **Root cause:** Every viewing transition accepts and persists caller-supplied
  `requestedDate` and `requestedTime`. Only confirmation/reschedule require a future time;
  cancellation and completion do not require the submitted schedule to match the current
  record.
- **Impact:** Staff can complete or cancel a confirmed appointment while changing the
  current and newly appended terminal schedule, contrary to the documented promise that
  terminal transitions preserve the recorded schedule.
- **Level 14 direction:** For terminal states, either ignore supplied schedule values and
  copy the current schedule or require exact equality. Test past terminal transitions,
  changed values, history, status synchronization, and optimistic concurrency.

### L13-M02 — The production admin boundary can create and publish rental records

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `shared/src/api.ts:135-136`,
  `backend/src/modules/properties/property.validation.ts:695-698`,
  `backend/src/modules/properties/property.service.ts:776-806,1138-1157`, and
  `frontend/src/features/admin/AdminPropertyForm.tsx:76,565-571`
- **Root cause:** The stable legacy `sale | rent` vocabulary is reused directly as the
  production admin create/edit input and UI option, and publish does not enforce `sale`.
- **Impact:** Staff can successfully create and publish a rental record that the public
  list, detail, facets, viewing, and sitemap boundaries intentionally hide. The workflow
  reports success while producing inventory that cannot appear in the sales-only product;
  the integrity scanner then reports it as invalid.
- **Level 14 direction:** Keep legacy/storage vocabulary isolated if needed, but constrain
  production admin network validation, UI, and publication to `sale`. Audit existing
  non-sale records deliberately; do not silently rewrite them. Add API/service/UI negative
  tests and a migration/reconciliation decision.

### L13-M03 — Initial inquiry notification and retry worker can deliver concurrently

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/modules/inquiries/inquiry.service.ts:168-258` and
  `backend/src/modules/inquiries/inquiry-notification-retry.service.ts:59-95,210-242`
- **Root cause:** A new inquiry is stored as `pending` with `nextAttemptAt` equal to now,
  then the request path sends directly without acquiring a lease. A retry worker can claim
  that same immediately-due record and send while the initial send is in flight.
- **Impact:** Two application paths may intentionally send the same notification. Both use
  the stable provider idempotency key, which limits impact only if the future provider
  implements and honors idempotency; provider behavior is currently unverified. Initial
  state updates can also silently miss after the worker changes status to `sending`.
- **Level 14 direction:** Atomically own/lease the initial attempt or make the retry record
  ineligible until the initial attempt resolves. Preserve the stable key. Add a controlled
  concurrency test for initial send versus worker claim and both success/failure orders.

### L13-M04 — Integrity scanning materializes all growing collections

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/modules/operations/integrity.service.ts:236-250`,
  `backend/src/scripts/check-data-integrity.ts:13-20`, and
  `backend/src/lib/operational-target.ts:18-37`
- **Root cause:** Properties, inquiries, and pending cleanup debt are fetched without a
  cursor, pagination, aggregation, or maximum, then retained together in memory. The
  generic CLI parser accepts a bounded `limit`, but the integrity loader does not use it.
- **Impact:** Daily and recovery scans grow linearly with all production data and can create
  long database reads, process memory pressure, or failed recovery validation exactly when
  the tool is most needed.
- **Level 14 direction:** Design deterministic batched/cursor scanning and database-side
  duplicate checks while preserving complete cross-batch detection and PII-free bounded
  output. Define whether `--limit` is batch size or maximum and test large cardinalities.

### L13-M05 — Inquiry acceptance and integrity-reference semantics disagree

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `docs/api/public-api.md:142-158`,
  `backend/src/modules/inquiries/inquiry.validation.ts:103-190`,
  `backend/src/modules/inquiries/inquiry.service.ts:150-164`, and
  `backend/src/modules/operations/integrity.service.ts:109-112,164-167`
- **Root cause:** For non-viewing inquiries, an optional syntactically valid `propertyId`
  is accepted without requiring a current property. The integrity scanner classifies every
  absent referenced property as an error regardless of inquiry type or intentional legacy
  reference semantics.
- **Impact:** A legitimate stale/manual reference—or a deliberately supplied nonexistent
  identifier—can make the production integrity job exit with serious findings, reducing
  alert trust and obscuring real corruption.
- **Level 14 direction:** Decide the reference contract. Validate existence when the input
  is meant to be relational, or retain it as an external/free reference and adjust scanner
  severity/logic. Add ingestion-to-scan tests for viewing, property, general, deleted/legacy,
  and malicious references.

### L13-M06 — 200% text sizing can clip public navigation and footer content

- **Status / confidence:** CONFIRMED / High
- **Evidence:** failed `e2e/accessibility-and-responsive.spec.ts:119-149` artifact and
  `frontend/src/app/globals.css:47-52,423-487,977-984,1109-1125,1280-1286`
- **Root cause:** Desktop header/footer layouts retain rem-based minimum columns and gaps
  until viewport-based breakpoints fire. At 200% root text in a 1,280 px viewport, footer
  minimums alone exceed the available width; `body { overflow-x: hidden }` clips rather
  than exposes it. The header also retains desktop navigation at the captured width.
- **Impact:** Low-vision users can lose or overlap navigation, contact, and footer content.
  The full browser gate fails WCAG-oriented reflow/text-resize acceptance.
- **Level 14 direction:** Use shrink-safe tracks/wrapping and switch header/footer layouts
  based on actual content pressure. Test all public routes and relevant admin states at
  200% text/browser zoom, asserting both document width and component overlap.

### L13-M07 — Admin skip link is not focusable in three session states

- **Status / confidence:** CONFIRMED / High
- **Evidence:** root link at `frontend/src/app/layout.tsx:32-34`; admin loading, anonymous,
  and error targets at `frontend/src/features/admin/AdminShell.tsx:115-150`; only the
  authenticated target at `:211` has `tabIndex={-1}`
- **Root cause:** The global skip link always targets `#main-content`, but three conditional
  admin `<main>` nodes are not programmatically focusable.
- **Impact:** Keyboard users cannot reliably transfer focus past repeated chrome while
  authentication is loading, unavailable, or rejected.
- **Level 14 direction:** Make every conditional main target consistently focusable and
  test skip-link activation under loading, 401/anonymous, network-error, and authenticated
  states.

### L13-M08 — Bounded I/O deadline policy is incomplete

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/config/database.ts:33-36`,
  `frontend/src/services/api-client.ts:53-64`, and the contrast with
  `frontend/src/features/properties/property.service.ts:9-18`
- **Root cause:** MongoDB config bounds server selection but not socket/query duration or
  the overall backend request. The generic frontend client has no default deadline; public
  property reads add one locally, while session/admin operations, map work, and inquiry
  submission rely only on optional lifecycle aborts.
- **Impact:** Network partitions or stalled dependencies can leave server work and UI states
  such as “Checking your session” or “Sending…” pending indefinitely, consume resources,
  and make retry semantics unclear.
- **Level 14 direction:** Define per-operation database, backend request, and browser
  deadlines with safe cancellation and user recovery. Inquiry retry must reuse the same
  client idempotency key. Add fake-stall and late-completion tests.

### L13-M09 — Authentication/API rate limits are not production-topology robust

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/modules/auth/auth.routes.ts:95-103`,
  `backend/src/app.ts:39`, rate-limit middleware under `backend/src/middleware/`, and
  `docs/architecture/authentication-and-authorization.md:265-270`
- **Root cause:** `/auth/callback` has no dedicated failure budget and can perform failed
  login audit writes under the 300-per-IP general limit. All limiters use the default
  process-local store, so effective budgets multiply across backend instances.
- **Impact:** Invalid callback traffic can amplify database/audit work, and horizontal
  deployment weakens login, inquiry, and API abuse limits unless an external edge supplies
  equivalent shared enforcement.
- **Level 14 direction:** Add a callback-failure limiter without account enumeration and
  define a shared-store or verified edge/WAF enforcement contract for multi-instance
  deployment. Test trusted-proxy IP behavior and cross-instance/edge acceptance.

### L13-M10 — Dynamic sitemap reads and retains the entire inventory

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `frontend/src/app/sitemap.ts:9-51`
- **Root cause:** Every force-dynamic sitemap request discovers `totalPages`, fetches every
  48-record page in batches of four, and flattens all summaries before building one result.
  A single later-page failure drops all property/location URLs for that response.
- **Impact:** Inventory growth increases API calls, memory, latency, rate-limit pressure,
  and timeout risk on a crawler-accessible route. Partial dependency failure causes an
  unstable SEO surface.
- **Level 14 direction:** Use bounded sitemap shards/indexes or an equally bounded cached
  generation model with stable invalidation and failure behavior. Add high-page-count,
  request-budget, memory-shape, and partial-failure tests.

### L13-M11 — Frontend deployment wrapper does not forward termination signals

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `scripts/frontend-deployment-start.mjs:21-38`
- **Root cause:** The wrapper spawns an npm child that starts Next.js and observes child
  exit, but it has no `SIGTERM`/`SIGINT` handlers to signal and await the child process.
- **Impact:** Depending on the host's process-group behavior, rollout or shutdown can leave
  the serving process alive after the wrapper exits, bypass graceful shutdown, conflict on
  ports, or delay replacement.
- **Level 14 direction:** Define and implement cross-platform signal forwarding/exit
  semantics (or remove the wrapper in favor of a verified supervisor contract). Add a
  Linux/container process-tree integration test and confirm on the selected host.

### L13-M12 — CI omits dependency health and strict deployment-build gates

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `.github/workflows/ci.yml:21-47` and
  `scripts/frontend-deployment-build.mjs:7-38`
- **Root cause:** CI runs `npm ci` and the ordinary test-mode build but not `npm audit`,
  `npm ls`, or a reserved-value `build:deployment` job using staging/production validation.
- **Impact:** A vulnerable/invalid dependency tree or regression in strict deploy-time
  configuration can merge even though the local Level 13 checks detect it.
- **Level 14 direction:** Add deterministic dependency/SCA policy and a secret-free strict
  deployment build to CI. Define audit exception handling rather than blindly failing on
  every informational warning.

### L13-M13 — Backend environment-specific credential files are not ignored

- **Status / confidence:** CONFIRMED / High
- **Evidence:** root `.gitignore:16-23`, `frontend/.gitignore:33-35`, and
  `git check-ignore --no-index` against backend/frontend env variants
- **Root cause:** Root rules ignore `.env`, `.env.local`, and selected `*.local` names but
  not `backend/.env.production`, `backend/.env.staging`, or `backend/.env.test`. The
  frontend's nested `.env*` rule happens to cover its variants.
- **Impact:** An operator following conventional backend environment filenames can
  accidentally stage server credentials. No such file is currently tracked, so this is a
  prevention defect, not a secret incident.
- **Level 14 direction:** Ignore backend `.env*` comprehensively while explicitly
  unignoring `.env.example`; add `git check-ignore` regression coverage or a documented
  secret-scanning pre-commit/CI control.

## 8. Low findings

### L13-L01 — Installed ESLint workspace peer topology is invalid

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `npm.cmd ls --all --json` exits `ELSPROBLEMS`; `frontend/package.json:28`
  requests ESLint 9 while `backend/package.json:29-37` requests `@eslint/js`/ESLint 10;
  the lock hoists `@eslint/js@10.0.1` beside root `eslint@9.39.5` and nests ESLint 10.9.1.
- **Impact:** Lint currently passes, but clean-install topology is invalid and root ESLint 9
  is marked unsupported/deprecated in the lock. Future npm/CI behavior can become brittle.
- **Level 14 direction:** Align compatible workspace lint generations/resolution without
  weakening rules; verify a clean root `npm ci`, `npm ls --all`, and both lint jobs.

### L13-L02 — Failed local image transformation cleanup is untracked

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `backend/src/modules/properties/property-media.storage.ts:55-82`
- **Root cause:** After Sharp transformation failure, source/delivery deletion uses
  `Promise.allSettled` and discards cleanup errors without creating cleanup debt.
- **Impact:** Development-local source or derivative files can remain indefinitely after a
  failed transformation. The current production adapter fails closed, so this is not a
  live production-storage defect today.
- **Level 14 direction:** Report/record failed compensation consistently and add filesystem
  failure-injection coverage.

### L13-L03 — Catalog error boundary calls the catalog “this property”

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `frontend/src/app/properties/error.tsx:6-8`
- **Impact:** The recovery action works, but the copy inaccurately describes a catalog
  failure as one property failing.
- **Level 14 direction:** Use catalog-specific copy and assert it in the route error test.

### L13-L04 — Displayed timestamps lack a consistent explicit timezone/semantic value

- **Status / confidence:** CONFIRMED / Medium
- **Evidence:** `frontend/src/app/properties/[slug]/page.tsx:230-235` and
  `frontend/src/features/admin/AdminInquiryDetail.tsx:34-46,510-548`
- **Root cause:** General property/admin timestamps use runtime-local formatting without a
  timezone, while viewing times explicitly use Philippine time. Several `<time>` elements
  omit a machine-readable `dateTime` attribute.
- **Impact:** Dates near midnight can differ by deployment/browser timezone, and the markup
  does not consistently meet its documented semantic-time claim.
- **Level 14 direction:** Select the business display timezone, retain ISO instants in
  `dateTime`, and add UTC/Asia-Manila boundary tests.

### L13-L05 — Public/admin chrome boundary uses an overbroad prefix

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `frontend/src/components/layout/PublicChrome.tsx:6-8`
- **Impact:** Any path beginning with `/admin`, including unrelated `/administrator`, loses
  public header/footer chrome even though it is not an admin route.
- **Level 14 direction:** Match exactly `/admin` or the `/admin/` segment and add a
  non-admin-prefix 404 regression.

### L13-L06 — Obsolete boundary generator writes an unused artifact

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `scripts/build-pampanga-admin3.mjs:7-12,315-333` writes
  `frontend/public/data/geography/pampanga-angeles-admin3.geojson`, while the documented
  generator writes `frontend/public/geo/pampanga-admin3.geojson` and the map uses the latter.
- **Impact:** A maintainer can run a plausible old generator, receive success, and update no
  served or tested asset.
- **Level 14 direction:** Remove/archive the stale executable path or align it with the
  authoritative generator; test the documented output path and metadata.

### L13-L07 — Scope/status documentation contradicts the implemented repository

- **Status / confidence:** CONFIRMED / High
- **Evidence:** `AGENTS.md:9-19`, `README.md:7-23`, `docs/ROADMAP.md:28-57`,
  `docs/features/performance-and-delivery.md:283-287`, and current source/tests
- **Root cause:** Contributor instructions still call authentication, admin, confirmed
  viewing transitions, uploads, notifications, approved logo/contact facts, and related
  slices deferred or absent; the README simultaneously describes parts as implemented and
  calls binary upload/notifications absent. Roadmap/status and historical test-count claims
  have not been reconciled with Levels 7–12 and the current failing browser gate.
- **Impact:** Future contributors and agents can avoid, duplicate, or undo shipped behavior,
  and reviewers can mistake historical evidence for current acceptance.
- **Level 14 direction:** Reconcile the authoritative scope/status documents without
  expanding MVP scope. Label historical gate evidence by commit/date and reflect current
  provider-blocked versus repository-implemented boundaries.

## 9. Informational observations

1. **L13-I01 — Authentication controls are strong.** OIDC Authorization Code + PKCE,
   state, nonce, issuer/audience/signature/expiry verification, one-time transactions,
   Auth0 MFA assurance, local issuer/subject allowlisting, opaque HMAC-stored sessions,
   idle/absolute expiry, rotation, revocation, and authorization-version invalidation are
   implemented. Production Auth0 behavior remains externally unverified.
2. **L13-I02 — Authorization/privacy boundaries are explicit.** Admin routes name required
   permissions; mutations require authentication, exact allowed origin, and session-bound
   CSRF. Public property projections omit private address/internal coordinates and add
   published-sale filters server-side. Inquiry responses do not echo submitted PII.
3. **L13-I03 — HTTP security posture is deliberate.** Exact credentialed CORS, Helmet,
   production HSTS, reviewed Next/Express headers, admin no-store/noindex, and CSP/provider
   origin validation are present. Live edge/header behavior is still an external test.
4. **L13-I04 — Runtime/operations foundations are meaningful.** App construction and
   listening are separated, non-development database startup fails closed, liveness and
   readiness differ, backend shutdown is bounded, logs are structured/request-correlated
   and allowlisted, and recovery procedures avoid speculative automatic repair.
5. **L13-I05 — Current secret/vulnerability evidence is clean.** No tracked live secret was
   confirmed and `npm audit` reported zero known vulnerabilities. This does not replace
   ongoing CI scanning or provider secret management.
6. **L13-I06 — Audit insertion is deliberately a separate write.** Documentation accepts
   that a successful business/security transition can be followed by a failed audit insert,
   pending production monitoring/owner approval. That known residual is not duplicated as
   a defect; L13-H02 is different because it destructively compensates a committed media
   mutation.
7. **L13-I07 — Browser fixture warnings are non-blocking evidence noise.** E2E emitted
   invalid-image warnings for deliberately missing fixture URLs while fallback assertions
   passed. They did not cause the recorded test failure, but cleaner fixtures would make
   future triage easier.

## 10. External/live blockers

The repository cannot supply evidence for live infrastructure, providers, business data,
or physical-device/assistive-technology acceptance. These are not converted into code
defects. Section 25 is the single definitive matrix and consolidates the known blockers
into 16 production-blocking root items:

- domain, DNS, TLS edge, proxy/WAF topology;
- controlled staging and release/rollback acceptance;
- production Auth0 and real MFA/session acceptance;
- production Atlas security and production-shaped query plans;
- real database backup/PITR and isolated restore rehearsal;
- production object storage/CDN and media recovery;
- transactional email and sender/delivery/idempotency acceptance;
- licensed production map tiles;
- centralized observability, alert routing, and operational ownership;
- approved representative inventory/media/business content;
- field performance/RUM;
- physical browser/device, upload-picker, screen-reader, and forced-colors acceptance;
- production SEO/social crawler verification; and
- retention/privacy/legal approval.

Repository branch protection is also unverified and appears separately as a governance
follow-up because existing project documents explicitly do not treat it as the Phase 0
product completion gate.

## 11. Functional readiness

### Properties

Public list/detail/facet routes are paginated, validated, projected, and constrained to
published sale records; unpublished/missing detail uses the same public 404 boundary.
Admin property CRUD/lifecycle, optimistic concurrency, preview, media metadata, and upload
surfaces exist. L13-M02 means the admin workflow does not itself enforce the sales-only
business boundary, and L13-H02 makes one upload failure order persistence-unsafe.

### Inquiries

Contact, seller, property, and viewing submissions validate bounded JSON, privacy consent,
honeypot, idempotency, rate limits, and persist before notification. Staff queue/detail,
notes, status, spam, archive/restore, permissions, and concurrency are present. L13-M03
affects notification concurrency; L13-M05 affects reference/integrity semantics; retention
and purge policy remain external.

### Viewings

A viewing submission is an inquiry request, not a calendar appointment. New requests must
reference a published, not-sold sale property. Staff confirmation, reschedule request,
completion, and cancellation transitions are explicit and audited. L13-M01 permits a
terminal transition to alter its schedule. Real MFA and live staff workflow acceptance are
external.

### Admin

The frontend gates staff pages through a server-backed session; the backend, not the UI,
enforces authorization. CSRF tokens stay in memory and private responses/pages are
no-store/noindex. No public staff provisioning route exists. L13-M07 affects skip-link
focus in conditional session states; L13-M08 can leave session/actions pending; production
Auth0 acceptance is outstanding.

## 12. Security, authentication, and privacy

The identity, session, CSRF, CORS, origin, permission, cache, and public/private DTO
boundaries are generally sound and have substantial negative test coverage. Production
configuration rejects missing Auth0 data, HTTP/loopback origins, implicit proxy trust,
debug logging, weak session/MFA policy, and ordinary unencrypted MongoDB URIs.

Readiness is reduced by L13-H01 (TLS downgrade validation), L13-M09 (callback/distributed
rate limiting), L13-M13 (backend env variants), and the lack of live Auth0/edge/provider
evidence. No tracked credential or private key was confirmed, and no public endpoint was
found that exposes inquiry content or private property location.

## 13. Media and location

MongoDB stores ordered metadata/URLs rather than blobs. Upload routes are protected,
content length and decoded pixels/dimensions/animation are bounded, signatures are
inspected, filenames are server-generated, Sharp normalizes delivery output, development
sample media is rejected in production, and the local adapter fails closed in production.
Public coordinates come only from a separately approved public point; serializers do not
derive it from private coordinates. Maps are complementary to textual/list results and
the boundary artifact records provenance, licensing, and a non-cadastral disclaimer.

L13-H02 breaks an upload compensation order; L13-L02 can leave development-local cleanup
residue; L13-L06 makes map artifact regeneration ambiguous. Real storage/CDN, versioning,
lifecycle, orphan/recovery evidence, map provider, approved listing media, and physical
upload-picker acceptance remain external.

## 14. SEO and social

Canonical metadata, page titles/descriptions, robots exclusions, social metadata,
Organization/WebSite/RealEstateListing structured data, published-sale sitemap filtering,
and noindex private/admin behavior are coherent and avoid invented address/hours/team
claims. Business name, `rcpremierph@gmail.com`, `+63 918 429 1873`, the supplied Facebook
URL, Pampanga/Angeles focus, and sales-only public positioning are used consistently.

L13-M10 makes the sitemap unbounded and failure-sensitive as inventory grows. Final domain,
real inventory, social crawler cards, production canonical/robots/sitemap responses, and
search-console-style acceptance cannot be verified locally.

## 15. Accessibility, responsive design, and browser readiness

Semantic landmarks, labels, error summaries, gallery dialog focus management, image
fallbacks, keyboard-operable controls, reduced-motion handling, mobile navigation, named
admin table scroll regions, visible availability text, and non-map alternatives are
substantial strengths.

The full browser gate failed because L13-M06 clips/overlaps content at 200% text. L13-M07
breaks consistent skip-link focus across admin session states. Existing 200% automation
covers only home, catalog, one detail page, and contact; About, Sell, Book a Viewing, and
admin states need coverage. There is no automated axe-equivalent scan. Physical Safari/iOS,
Android, Firefox/WebKit, screen reader, forced-colors/high-contrast, and physical upload
picker evidence remains external and must not be inferred from Edge/Chromium automation.

## 16. Performance

Next image delivery, lazy map/video loading, bounded public/admin page sizes, projections,
indexes, caching decisions, and performance regression tests show deliberate engineering.
No public N+1 property fetch was confirmed.

L13-M10 creates crawler-amplified sitemap work; L13-M04 creates unbounded operational reads;
L13-M08 lacks end-to-end deadlines; process-local rate limits in L13-M09 weaken protection
when scaled. Local synthetic measurements do not establish production Core Web Vitals,
real-network budgets, or RUM.

## 17. Deployment

The environment matrix distinguishes development/test/staging/production; strict builds
reject incomplete production-shaped public configuration; API/site/media/map origins are
validated; same-site cookies/topology and exact proxy hops are documented; backend startup
and readiness fail closed around MongoDB. The reserved-value strict deployment build passed.

L13-H01 weakens a production environment gate, L13-M11 leaves frontend process-tree shutdown
uncertain, L13-M12 omits strict deployment build enforcement in CI, and L13-M13 weakens
credential-file hygiene. No real host, domain, certificate, proxy count, staging artifact,
rollback execution, or live header/cookie behavior was available.

## 18. Monitoring and operations

Structured logs use request/build IDs and allowlisted fields rather than headers, bodies,
tokens, messages, addresses, or private coordinates. Liveness/readiness signals, provider
runbooks, severity guidance, notification retry state, cleanup debt, and a scan-only
integrity command exist.

L13-M03, L13-M04, L13-M05, L13-M08, and L13-M09 limit production reliability of the
operational paths. The deliberately non-transactional audit-write policy requires live
alerting approval. No centralized logs/errors/RUM, uptime probes, alert destinations,
on-call assignments, retention settings, scheduler, or live incident exercise was verified.

## 19. Backup and recovery

The repository documents separate database/media recovery, isolated restores, new session
secrets after restore, mail suppression, integrity/privacy/sales-only validation, evidence
preservation, and provider-safe reconciliation. It does not pretend local exports are a
backup system and does not automate destructive repair.

No Atlas backup/PITR policy, successful backup record, isolated database restore, measured
RPO/RTO, object-version recovery, media reconciliation, or restore alert was available.
L13-M04/M05 must be corrected before the integrity command can be relied upon as a
production-scale restore gate.

## 20. Database and data integrity

Schemas use validation and explicit indexes for public discovery, identifiers, lifecycle,
sessions, notification IDs, queue access, and cleanup debt. Public and admin lists are
bounded, regex input is escaped, projections are intentional, and optimistic concurrency
uses state/version predicates. Viewing creation checks live property eligibility.

Readiness is reduced by L13-H02, L13-M01, L13-M02, L13-M04, and L13-M05. Production-shaped
Atlas execution plans, cardinality/selectivity evidence, least-privilege users, network
controls, and real inventory are external. No new index is recommended without that
evidence.

## 21. Test quality

The 264 Vitest tests cover validation, security-negative paths, permissions, sessions,
concurrency, public projections, lifecycle, retries, media checks, integrity rules,
configuration, and operational behavior. The 46 Playwright tests cover representative
public/admin flows, responsive matrices, gallery, maps, errors, and payload/header behavior.
No skipped/focused tests were found.

Gaps are substantive rather than numerical:

- the full E2E gate is red at 200% text, while focused repeats can pass;
- several confirmed failure orders and races have no regression test;
- admin Playwright flows intercept protected API calls instead of proving a browser-to-real
  authenticated backend integration;
- no real MongoDB/Auth0/email/storage/edge acceptance can be supplied by mocks;
- 200% text coverage omits several public routes and all conditional admin states;
- there is no automated accessibility scanner and no physical-device/assistive-tech pass;
- CI does not enforce dependency tree/audit or the strict deployment build.

Tests are not falsely described as production acceptance. The failure and coverage limits
are retained as evidence rather than rewritten.

## 22. Documentation and Git hygiene

Persistent documentation is centralized under `docs/`, with clear architecture, API,
database, development, release, operations, and recovery material. One root lockfile is
tracked. Real env, backup/recovery, dump, log, cache, build, test, and local-media artifacts
are generally excluded. The audit branch was created from the expected Level 12 commit;
there was no merge, rebase, push, stash application, or source remediation.

L13-L07 captures scope/status contradictions; L13-L06 captures the stale generator;
L13-M13 captures the env-ignore hole; L13-L01 captures lock/install topology. Repository
branch protection remains an external repository-admin follow-up. `stash@{0}` is preserved
by both name and object ID.

## 23. Launch-readiness score

The score measures evidence available now, including repository defects and required live
acceptance. Each category contributes a fixed number of the 100 total points; deductions
name the evidence preventing full credit.

| Category                 |              Score | Principal deductions                                                                                        |
| ------------------------ | -----------------: | ----------------------------------------------------------------------------------------------------------- |
| Core functionality       |            12 / 15 | Viewing terminal schedule, sales-only admin boundary, notification concurrency, live staff acceptance       |
| Security/auth/privacy    |            11 / 15 | Mongo TLS downgrade validation, callback/distributed rate limits, env-ignore gap, live Auth0/edge           |
| Data integrity           |             7 / 12 | Media compensation corruption, viewing/rental records, scanner scale/semantics, no production data evidence |
| Media/location           |              5 / 8 | Media persistence bug, no production storage/CDN/recovery/map provider or approved inventory media          |
| SEO/social               |              6 / 7 | Unbounded sitemap and no live domain/crawler verification                                                   |
| Accessibility/responsive |              5 / 8 | Failed 200% reflow, admin skip target, incomplete physical/assistive acceptance                             |
| Performance              |              6 / 8 | Unbounded sitemap/integrity work, deadline gaps, no field CWV/RUM                                           |
| Deployment               |              5 / 8 | Signal propagation, CI deployment gate, no real staging/host/proxy/rollback evidence                        |
| Monitoring/operations    |              4 / 7 | Retry/integrity/rate-limit weaknesses and no live aggregation/alerts/scheduler/on-call evidence             |
| Backup/recovery          |              2 / 5 | Runbooks exist; actual backup/PITR/restore/media rehearsal evidence does not                                |
| Documentation/testing    |              5 / 7 | E2E gate failure, CI/dependency gap, stale scope/status documents, external QA gaps                         |
| **Overall**              | **68 / 100 (68%)** | **2 High and 13 Medium repository defects plus 16 production-blocking live gates**                          |

The score is not a probability and is not raised by documentation alone. Fixing Level 14
defects would permit a new engineering-readiness assessment, but external acceptance would
still prevent an automatic production-ready classification.

## 24. Level 14 remediation plan

This is a plan only. **Level 14 has not started.** Execute it on a separate remediation
branch, keep business migrations deliberate, and rerun the complete quality/security gate
after the final fix.

| Order | Finding          | Area                   | Recommended remediation                                                                                                     | Required regression evidence                                                                                                 | External dependency                           |
| ----: | ---------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
|     1 | L13-H01 / High   | Backend env            | Reject TLS/SSL false and conflicting Mongo URI options while preserving encrypted non-local DB validation.                  | Direct validator and production module-load negative cases for SRV/standard schemes and option aliases.                      | None                                          |
|     2 | L13-H02 / High   | Property media service | Separate pre-commit storage compensation from post-commit audit failure; never delete a persisted reference.                | Failure injection for storage, metadata, audit, cleanup-debt failure, cover/gallery result, and response behavior.           | None; later adapter acceptance separate       |
|     3 | L13-M13 / Medium | Git/secret hygiene     | Ignore backend `.env*` and explicitly retain `.env.example`; consider CI secret scanning.                                   | `git check-ignore` matrix for root/backend/frontend examples and templates.                                                  | None                                          |
|     4 | L13-M01 / Medium | Viewing CRM            | Preserve current schedule on completed/canceled transitions or reject unequal input.                                        | Service/API tests for equal/changed/past schedules, history, state synchronization, and stale version.                       | None                                          |
|     5 | L13-M02 / Medium | Property admin         | Restrict production admin create/edit/publish to sale; isolate legacy rent vocabulary and review existing data.             | Shared/API/service/UI negative tests; explicit scan/migration rehearsal for non-sale records.                                | Business owner approves record disposition    |
|     6 | L13-M03 / Medium | Notifications          | Lease/own the initial delivery or defer retry eligibility until it resolves.                                                | Deterministic concurrent initial/worker send tests for success, failure, crash, lease expiry, attempts, and idempotency key. | Live provider later verifies idempotency      |
|     7 | L13-M05 / Medium | Inquiry/integrity      | Align optional property-reference ingestion and scan semantics.                                                             | End-to-end validation-to-scan cases for every inquiry type, nonexistent/legacy IDs, and malicious input.                     | Business/data owner decides legacy semantics  |
|     8 | L13-M04 / Medium | Integrity operations   | Stream/page scans, use database-side duplicate support, bound output, and define CLI limit semantics.                       | Large-cardinality fake/integration tests, cross-batch duplicates, bounded query/memory behavior, PII-free output/exit codes. | Production-shaped Atlas validation later      |
|     9 | L13-M09 / Medium | Abuse controls         | Add callback-failure limiting and select shared store or exact edge/WAF contract for multi-instance use.                    | Callback burst, IP/proxy, limiter isolation, multi-instance or edge acceptance, no enumeration.                              | Hosting/edge choice for shared enforcement    |
|    10 | L13-M08 / Medium | DB/API/frontend        | Set bounded database/query/request/client deadlines and safe abort/retry behavior.                                          | Stalled DB/API/map/session/inquiry tests, late completion, cleanup, visible recovery, stable inquiry key.                    | Host timeout alignment later                  |
|    11 | L13-M10 / Medium | SEO/performance        | Replace whole-inventory dynamic sitemap with bounded cached shards/index or equivalent.                                     | Large totals, request-count budget, stable shard URLs, failure recovery, sales/published filtering.                          | Final domain/inventory acceptance later       |
|    12 | L13-M11 / Medium | Frontend deployment    | Forward signals through the wrapper or adopt a verified direct supervisor command.                                          | Linux/container process-tree SIGTERM/SIGINT test, exit code, bounded shutdown, restart/port reuse.                           | Selected host acceptance later                |
|    13 | L13-M06 / Medium | Responsive CSS         | Make header/footer shrink/wrap/switch under text enlargement; do not mask clipped content.                                  | All public routes plus admin states at 200% text and browser zoom; width and overlap assertions at boundary viewports.       | Physical device/zoom pass later               |
|    14 | L13-M07 / Medium | Admin accessibility    | Give every conditional `#main-content` target consistent programmatic focus.                                                | Skip-link focus under loading, anonymous, error, forbidden, and authenticated states.                                        | Real screen-reader pass later                 |
|    15 | L13-M12 / Medium | CI/release             | Add `npm ls`, scoped audit/SCA policy, and safe strict deployment-build job after fixes.                                    | Clean CI install; prove each job catches an injected fixture/misconfiguration; document exceptions.                          | Repository-admin settings for required checks |
|    16 | L13-L01 / Low    | Toolchain              | Align compatible ESLint major/peer placement across workspaces and regenerate only the root lock.                           | Fresh root `npm ci`, `npm ls --all`, backend/frontend lint, full gate.                                                       | None                                          |
|    17 | L13-L02 / Low    | Local media            | Record/log compensation deletion failures consistently.                                                                     | Filesystem removal failure tests and debt/report behavior.                                                                   | None                                          |
|    18 | L13-L03 / Low    | Catalog UX             | Correct the catalog error message.                                                                                          | Catalog error-boundary copy/retry assertion.                                                                                 | None                                          |
|    19 | L13-L04 / Low    | Date/time UI           | Use an approved display timezone and ISO `dateTime` attributes.                                                             | UTC/Asia-Manila midnight boundaries and semantic markup assertions.                                                          | Business owner confirms display policy        |
|    20 | L13-L05 / Low    | Layout routing         | Match `/admin` as an exact segment.                                                                                         | `/admin`, `/admin/...`, `/administrator`, and unrelated 404 chrome tests.                                                    | None                                          |
|    21 | L13-L06 / Low    | Map tooling            | Remove/archive or align the unused generator and make the output contract singular.                                         | Generator path, feature count, metadata/provenance, and consumed-asset verification.                                         | Source/licensing recheck if regenerated       |
|    22 | L13-L07 / Low    | Documentation          | Reconcile AGENTS, README, roadmap, indexes, and historical quality evidence with actual implemented/provider-blocked scope. | Link/command review plus source-to-contract checklist; do not change product behavior.                                       | Business owner confirms roadmap wording       |

Recommended sequencing protects credentials/security first, then persistence/workflow data,
operational concurrency/scale, deployment/accessibility gates, CI enforcement, and low-risk
cleanup. CI should enforce the corrected state after—not conceal—the underlying fixes.

## 25. Live acceptance matrix

This table is the single authoritative Level 13 summary. “Blocking” means production must
not be declared ready without recorded evidence. These actions do not authorize provider
selection or external changes during Level 13.

| ID  | External/live item                                                  | Why required                                                                                                             | Owner/action                                                                                        | Prerequisite                                                                   | Blocking                                                | Verification                                                                                                     | Owning runbook/phase                         |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| X01 | Final domains, DNS, HTTPS edge, proxy count, WAF/shared limits      | Establish trusted origins, cookies, redirects, client IP, TLS, and abuse boundary                                        | Deployment owner selects host/domain and records exact hop/edge policy                              | Level 14 security/deployment fixes; provider accounts                          | Yes                                                     | External DNS/TLS/header/IP/rate-limit probes from outside host                                                   | Level 11 deployment topology/release         |
| X02 | Real controlled staging deployment                                  | Prove built artifacts, secrets, migrations, smoke, security, and rollback outside local mocks                            | Deployment and application operators deploy reviewed commit and execute checklist                   | X01 plus staging Atlas/Auth0/storage/email/map configuration                   | Yes                                                     | Record build ID, smoke results, admin flows, failure paths, rollback and clean redeploy                          | `docs/development/deployment-and-release.md` |
| X03 | Production Auth0 and MFA/session acceptance                         | Validate callback/logout origins, secret, factors, `amr:mfa`, allowlist, revoke/disable/recovery                         | Deployment owner configures tenant; business/admin owner provisions approved staff                  | Final origins and Level 14 completion                                          | Yes                                                     | Real login, MFA, callback, session, CSRF, logout, disable/revoke, recovery evidence                              | Auth setup and authentication operations     |
| X04 | Production/staging Atlas security and query plans                   | Validate encrypted network path, least privilege, indexes, cardinality and latency                                       | Database owner provisions cluster/users/network and runs `executionStats` on representative shapes  | Approved data shape and Level 14 query/tool fixes                              | Yes                                                     | Readiness, permission-negative tests, index inventory, explain plans for public/admin/ops queries                | Deployment + database docs                   |
| X05 | Atlas backup/PITR policy and successful backup                      | Repository cannot create durable provider backups or prove retention                                                     | Database owner configures schedule/retention/alerts and records completed backup                    | X04; approved RPO/retention                                                    | Yes                                                     | Provider evidence for success/failure alert, retention and restore point                                         | Level 12 operations/DR                       |
| X06 | Isolated database restore rehearsal                                 | A configured backup is not recovery evidence                                                                             | Database owner restores into isolated target; application/incident owners validate                  | X05; isolated network, new session secret, mail disabled                       | Yes                                                     | Timed restore, counts/indexes/integrity/privacy/sales-only/admin/public checks; measured RPO/RTO                 | `docs/development/disaster-recovery.md`      |
| X07 | Object storage/CDN, versioning, lifecycle, production adapter       | Production uploads currently fail closed and URLs need durable delivery/ownership                                        | Deployment owner selects/configures provider and adapter with least privilege                       | Final media origin, bucket namespace, retention/cache decisions; L13-H02 fixed | Yes                                                     | Upload/read/delete/rollback, headers, CSP/CORS, ownership, cache and outage tests                                | Property media + deployment docs             |
| X08 | Media backup, restore, and DB/object reconciliation                 | Database-only recovery can leave broken or orphaned media                                                                | Deployment/database owners restore matching object versions and run safe report                     | X07 and X06; originals/version history                                         | Yes                                                     | Isolated object restore, missing/orphan report, derivative regeneration and no unsafe delete                     | Level 12 DR/media recovery                   |
| X09 | Transactional email and verified sender                             | Persisted inquiries need proved operational delivery/failure handling                                                    | Application operator selects provider, authenticates sender/domain, configures receiver/credentials | Level 14 notification race fixed; monitoring configured                        | Yes                                                     | Receipt, provider idempotency, retry/backoff, outage, terminal failure and alert evidence                        | Deployment + operations email runbook        |
| X10 | Production map-tile provider                                        | Strict builds require licensed tile config and production reliability limits                                             | Application/deployment owner approves provider/account/domain attribution                           | Final domain, budget/license approval                                          | Yes                                                     | Live tiles, attribution/link, CSP, rate/quota failure and text/list fallback                                     | Geographic maps + deployment docs            |
| X11 | Central observability, uptime, RUM, alerts, routing, on-call        | Local logs/runbooks do not page an accountable operator                                                                  | Application operator selects ingestion/probes; business assigns alert destinations/roles            | Host/providers selected; retention approval                                    | Yes                                                     | Synthetic liveness/readiness, 5xx/429/auth/email/storage/backup/integrity alerts and incident exercise           | `docs/development/operations.md`             |
| X12 | Representative production inventory, media, and business approval   | Synthetic fixtures cannot validate real content, lifecycle, privacy or performance                                       | Business/admin owner supplies and approves sale listings/media/contact claims                       | Storage available; content/legal approvals                                     | Yes                                                     | Editorial review plus public/admin/search/viewing/media/privacy checks using representative volume               | Levels 1, 2, 7 and content/media docs        |
| X13 | Production Core Web Vitals and RUM                                  | Lab/local results cannot prove real-device/network experience                                                            | Application operator captures field/staging measurements and investigates budget misses             | X02, X11, X12                                                                  | Yes                                                     | LCP/INP/CLS and route/resource/error dashboards over agreed observation window                                   | Level 10 performance                         |
| X14 | Physical browser/device/assistive acceptance                        | Chromium automation cannot establish Safari/iOS, Android, Firefox/WebKit, picker, screen-reader or forced-color behavior | QA/business owner executes documented matrix on real devices/assistive tech                         | Level 14 accessibility fixes; X02/X12                                          | Yes                                                     | Signed matrix with Safari/iOS, Android, Firefox/WebKit, zoom, screen readers, forced colors, phone/tablet picker | Level 9 accessibility/browser QA             |
| X15 | Production SEO/social crawler verification                          | Local metadata cannot prove final canonical, sitemap, robots or card ingestion                                           | Application/business owner verifies final domain with crawler/search/social tools                   | X01, X02, X12; sitemap fix                                                     | Yes                                                     | Fetch/render canonical, robots, sitemap shards, JSON-LD, Open Graph/cards, 404/noindex behavior                  | Level 8 SEO/social                           |
| X16 | Retention, privacy/legal, purge, and operational ownership approval | Inquiries/audits contain personal/business records with no approved lifetime or named people                             | Business/legal/data owners approve consent copy, retention/purge, audit access and named operators  | Applicable law/business process; backup/monitoring design                      | Yes                                                     | Recorded policy, access review, safe purge rehearsal, backup interaction and owner sign-off                      | Level 12 operations + database docs          |
| X17 | Main branch protection/required checks                              | Repository convention alone cannot enforce reviewed releases                                                             | Repository administrator enables PR/CI protections                                                  | Level 14 CI jobs defined                                                       | No under current roadmap; recommended before production | Repository-settings evidence and rejected direct-push test                                                       | Git workflow accepted follow-up              |

## 26. Files changed

Only legitimate Level 13 documentation is changed:

- `docs/audits/level-13-production-readiness.md` — this authoritative report, matrix, score,
  and Level 14 plan.
- `docs/README.md` — documentation index entry for the audits directory/report.

No frontend, backend, shared contract, test, workflow, dependency, environment, provider,
or generated artifact is modified.

## 27. Git

- **Branch:** `audit/production-readiness`
- **Audit commit:** the commit containing this report, with subject
  `docs: add production readiness audit`; the immutable hash is reported in the final
  handoff rather than self-embedded in its own content.
- **Worktree:** required to be clean after the audit commit; final handoff verification
  records the actual state.
- **Stash:** `stash@{0}` remains present and unapplied, with object
  `e3070251f4c5530abd4d2a2410365ab2a0789c2a`.
- **Forbidden history operations:** no merge, rebase, reset, push, stash apply/pop, or
  Levels 1–12 rewrite occurred.

## 28. Level 13 Definition of Done

**Result: PASS.** “Full quality gate run” means every required command was executed and its
real result recorded; it does not mean every product gate passed.

- [x] Repository baseline verified.
- [x] No unrelated work modified.
- [x] `stash@{0}` untouched.
- [x] Secret audit performed.
- [x] Dependency audit performed.
- [x] Frontend audited.
- [x] Backend audited.
- [x] Auth0 audited.
- [x] Sessions audited.
- [x] Authorization audited.
- [x] CSRF/CORS/origin audited.
- [x] Security headers/CSP audited.
- [x] Input/upload security audited.
- [x] Property lifecycle audited.
- [x] Sales-only boundary audited.
- [x] Inquiry CRM audited.
- [x] Viewing workflow audited.
- [x] Media architecture audited.
- [x] Media upload/storage audited.
- [x] Media cleanup/recovery audited.
- [x] Location privacy audited.
- [x] Maps audited.
- [x] Contact/business content audited.
- [x] Notification/retry architecture audited.
- [x] Admin/public navigation audited.
- [x] Public UX audited.
- [x] Gallery audited.
- [x] Responsive behavior audited.
- [x] Accessibility audited.
- [x] SEO audited.
- [x] Structured data audited.
- [x] Performance audited.
- [x] Database query/index behavior audited.
- [x] Pagination/growth audited.
- [x] Logging/privacy audited.
- [x] Integrity tooling audited.
- [x] Deployment configuration audited.
- [x] Environment matrix audited.
- [x] Health/readiness audited.
- [x] CI/release audited.
- [x] Backup/recovery audited.
- [x] Monitoring/alerting audited.
- [x] Documentation audited.
- [x] Git/artifact hygiene audited.
- [x] Test quality audited.
- [x] Full quality gate actually run and failures retained.
- [x] Repository findings severity-ranked and deduplicated.
- [x] External/live blockers separately cataloged.
- [x] Launch-readiness percentage calculated.
- [x] Level 14 remediation plan produced.
- [x] No Level 14 remediation implemented.
- [x] No Level 15 functionality implemented.
- [x] **Level 14 NOT STARTED.**

The audit itself is complete. Product launch readiness is not.

## 29. Final launch classification

**READY AFTER LEVEL 14**

Rationale: there are no Critical findings, but two High and thirteen Medium confirmed
repository defects require remediation and regression evidence. Even after Level 14, the
application must not be called production-ready until the 16 production-blocking items in
the live acceptance matrix are verified. This classification is not
“ENGINEERING READY — LIVE ACCEPTANCE REQUIRED” because repository defects remain, and it
is not “READY FOR CONTROLLED STAGING” because the remediation gate precedes controlled
staging acceptance.

## 30. Recommended next step

Stop after this audit. Review/approve the Level 13 findings and open a separate **Level 14 —
Remediation** effort from the audited baseline. Execute the plan in the stated risk order,
preserve explicit business/provider decisions, rerun the complete gate, and issue a focused
post-remediation readiness reassessment. Do not start Level 15 automatically.
