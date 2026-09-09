# Testing Conventions

Vitest is the unit and HTTP integration runner. It was selected for direct TypeScript/ESM
support, fast isolated tests and compatibility with the existing npm-workspaces setup.
Supertest exercises the Express application without opening a network listener.
Playwright drives browser acceptance and responsive checks against the compiled real
Express app with injected in-memory property/inquiry service doubles; fixture listings
are never production seed data.

## Commands

Run from the repository root:

```bash
npm test
npm run test:watch
npm run test:e2e
```

On Windows, Playwright uses the installed Microsoft Edge channel. In CI it targets the
system Chrome channel. On another local platform, install Playwright Chromium once if it
is not already available:

```bash
npx playwright install chromium
```

The normal completion gate remains:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## What tested means

- Pure formatting, parsing, validation and query-building rules have unit tests.
- An API endpoint has an HTTP-level integration test covering its success response and
  important validation or visibility failure. Services are dependency-injected so this
  layer does not pretend that a missing MongoDB service is working.
- Authentication HTTP tests use an in-memory session/store boundary and a fake OIDC
  provider. Protocol tests separately run `openid-client` against a local issuer with a
  generated signing key and JWKS, so issuer, audience, signature, expiry, state, nonce
  and PKCE failures are exercised without a live Auth0 dependency. They also verify the
  MFA `acr_values` request, accepted `amr: ["mfa"]`, development-only signed passkey
  evidence, rejection of client-supplied passkey signals, fail-closed
  missing/empty/password-only evidence, and production rejection of passkey-only
  evidence.
- Level 6 regression tests additionally cover absent/partial production configuration,
  missing/duplicate/expired transactions, email-only non-authorization, immutable
  absolute expiry, store outages, exact CORS behavior, proxy trust, security headers,
  redacted errors and query-string disclosure.
- Session tests assert exact-once revocation audit events for rotation, logout,
  concurrent-limit eviction, staff deactivation and stale local authorization. Repeated
  revocation attempts create no false event, and serialized audits are checked against
  raw tokens, hashes, cookies, CSRF values, callback codes and provider tokens.
- Admin-property HTTP tests exercise all four protected routes as anonymous, denied and
  permitted callers. They cover session rejection, exact-origin and session-bound CSRF
  enforcement, strict allowlisted validation, forced draft creation, draft-only edits,
  public invisibility and the shared error envelope without a live database or Auth0.
- Admin-property service tests prove explicit field assignment, stale-write rejection,
  and exact-once safe audit metadata for successful creates and edits. Location coverage
  confirms private addresses and coordinate values never enter audit metadata. Failed or
  non-draft edits emit no success event.
- Staff-inquiry HTTP tests prove anonymous and permission denial, authorized list/detail,
  bounded search/filter pagination, CSRF-protected status/spam/note/archive actions,
  invalid input and missing records. Service tests prove pre-spam restoration,
  optimistic concurrency, status history, recoverable archive and audit metadata free of
  inquiry/note content. Public tests cover request-key validation and duplicate-key retry
  recovery. The protected browser fixture covers queue/detail rendering, status, notes,
  spam restoration, CSRF forwarding, memory-only session state and 320-pixel overflow.
- Mongoose query builders are tested for the published-only predicate and sanitised user
  input. Automated suites do not need MongoDB; the separate temporary Atlas persistence
  acceptance is recorded below.
- A public user journey has a browser test for navigation, URL state, responsive overflow
  and accessible form feedback.
- The protected admin browser fixture covers session bootstrap, the unauthenticated
  sign-in URL, no-index metadata, private list, draft create/edit, CSRF forwarding,
  private/public location authoring, memory-only client state, forbidden and
  expired-session states. It also verifies private HTML cache headers and confirms both
  local and session storage stay empty. It intercepts the Auth0/session boundary and
  does not claim to test a live provider login.
- Level 15 focused coverage verifies availability/residential-sale validation, removable
  URL filter chips, bounded/non-fabricated related inventory, publish readiness,
  notification summaries, formula-neutralized current-page CSV, Philippine calendar
  ranges, aggregate dashboard query shapes, value-minimized audit projection, broad-search
  privacy, and the dashboard/calendar at 320 pixels and 200% text. The operations browser
  fixture uses protected route mocks and does not claim live Auth0 or Atlas acceptance.
- The interactive map has browser coverage for deferred loading, shared URL filters,
  card/marker synchronization, approved-point privacy and isolated data failures.
- Practical performance checks guard initial encoded JavaScript, layout shift, long
  tasks, DOM size, image-preload discipline, progressive galleries, raw-PNG delivery,
  pre-intent third-party requests and accidental eager boundary downloads. They are
  regression budgets, not a substitute for production field monitoring.
- Manual visual acceptance includes mobile, tablet and desktop viewports and records any
  external blocker rather than silently skipping it.

## Test data

Fixtures use clearly synthetic RC test identifiers and are confined to test files. They
may demonstrate card, filter and detail states in automated browser QA but must never be
loaded by the production server or described as real inventory.

The Playwright fixture API runs on loopback port 5051 and an isolated production-build
frontend on port 3100. The pretest command builds every workspace with the fixture and
site origins embedded in the frontend bundle. Playwright's global setup starts both HTTP
servers in process and returns an explicit async teardown, avoiding platform-dependent
shell-process cleanup. The fixture keeps no state and marks responses as fixture-only.
Its synthetic map points are explicitly approved test points; they are not derived from
real addresses. Browser coverage verifies home and primary navigation, all required
property search fields, URL-backed results and empty states, property detail/inquiry
links, a successful inquiry payload, lazy map/filter/card interaction, mobile-menu
keyboard behavior, semantic page shells and horizontal overflow at 320, 360, 375, 390,
412, 414, 430, 480, 640, 768, 820, 1024, 1280, 1366, 1440, 1600 and 1920 pixels.
Admin property coverage uses 320, 360, 390, 768, 1280 and 1920 pixels. Captures and
failure traces stay under the configured ignored Playwright output directory.

Level 9 browser checks also cover landmark and heading structure, duplicate IDs, form
labels, named controls, skip navigation, real keyboard focus order, modal trapping and
restoration, mobile scroll locking, form-error association/focus, restrained live-region
use, gallery position, failed-image fallback, video focus transfer, clipboard failure,
map retry, upload progress and media-reorder focus. Reduced-motion behavior and
representative public pages at 200% root text sizing have regression assertions. These
targeted checks are not an accessibility certification or a substitute for real
assistive-technology and device testing; see
[`accessibility-responsive-browser-qa.md`](../features/accessibility-responsive-browser-qa.md).

The performance spec currently enforces practical fixture-environment ceilings of CLS
`<= 0.1`, longest observed main-thread task `< 500 ms`, initial encoded JavaScript below
1 MB and fewer than 1,500 initial DOM nodes on the home, catalog and representative
property-detail mobile entry routes. It also proves those entries make no eager boundary,
YouTube or direct raw-PNG source request. Focused assertions keep one true homepage LCP
preload, secondary imagery lazy, one current detail-image preload, nonselected gallery
media lazy, and fullscreen media absent before activation. These figures are deliberately
coarse cross-environment guards; production Core Web Vitals need real-user or controlled
staging measurement after hosting, media and analytics are selected. See
[`performance-and-delivery.md`](../features/performance-and-delivery.md) for methodology,
before/after evidence and limitations.

## External integration boundary

Level 12/14 deterministic coverage verifies server-generated request IDs, allowlisted
structured logs without header/query/body values, durable post-persistence notification
state and initial lease ownership, stable delivery idempotency, bounded retry/terminal
behavior, provider fail-closed behavior, explicit production targeting, media/audit
ordering, cleanup debt, storage-failure metadata safety, bounded full-cardinality integrity
scanning, request deadlines, and PII-free reports. Provider backup/restore and alert
acceptance remain live external checks, not mocked claims.

Neither Vitest nor Playwright connects to the project database or Auth0. The backend HTTP
tests inject service doubles, the OIDC protocol tests use a loopback signed issuer, and
the browser tests use the explicit fixture API. They prove application behavior without
pretending to prove external connectivity or persistence.

The project Atlas environment passed this persistence gate on 2026-09-05: the real health
endpoint reported a connected Mongoose state, and temporary synthetic property and
inquiry records passed create/read/delete checks. The property check used the public
service projection and confirmed private fields stayed excluded. There is intentionally
no public inquiry read endpoint and no production seed command. Use synthetic data only;
never submit a real person's details during verification.

The protected `/admin` property/inquiry workflows have isolated browser coverage. A
passkey authentication and redirect to the public root were reported against
the Auth0 Free development tenant on 2026-09-06. That evidence does not yet verify the
application session cookie, `/admin` return URL, protected MongoDB operations, CSRF
behavior or logout against the live tenant; those remain explicit manual gates in
[`auth0-setup.md`](auth0-setup.md). Production still requires validated `amr: mfa` and
cannot use the development-only signed passkey assurance. Client accounts and broader
administration remain later work.

Level 5 location acceptance should use synthetic or verified staff-provided values only:
edit a draft with both private and public pairs, confirm the protected detail returns the
private pair, confirm every public list/detail/map response omits it, verify a no-point
listing keeps textual location, force a stale version to receive `409`, and exercise the
map at mobile/tablet/desktop sizes with tile attribution visible. Do not write a regional
default or test coordinate into real inventory. This live post-change acceptance pass has
not yet been recorded.

## CI

Pull requests run clean install, dependency topology validation, high-severity production
dependency audit, formatting, lint, typecheck, unit/API integration tests, both ordinary
and strict staging-shaped deployment builds, and Playwright browser acceptance. CI uses the installed Chrome channel with one
worker and retries; local Windows runs use installed Microsoft Edge. Run the complete
gate locally before handoff because a configured workflow is not proof that a particular
unpublished branch has passed remotely.

The production dependency audit fails on high or critical advisories. An exception must
be a reviewed repository change naming the advisory, affected runtime path, compensating
control, owner, and expiry; force/legacy-peer flags or an undocumented audit ignore are
not acceptable policy.

Record browser evidence accurately. A local Edge run does not prove Chrome, Firefox,
WebKit or physical Safari/iOS behavior, and the configured Chrome CI project is not a
pass until that workflow has actually run. Real screen-reader review, forced-colors
review and physical phone/tablet upload acceptance remain manual checks unless their
exact environment and results are recorded.
