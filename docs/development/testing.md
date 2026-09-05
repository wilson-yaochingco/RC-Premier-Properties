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
  and PKCE failures are exercised without a live Auth0 dependency.
- Mongoose query builders are tested for the published-only predicate and sanitised user
  input. Real persistence remains a separate integration gate that needs MongoDB.
- A public user journey has a browser test for navigation, URL state, responsive overflow
  and accessible form feedback.
- The interactive map has browser coverage for deferred loading, shared URL filters,
  card/marker synchronization, approved-point privacy and isolated data failures.
- Practical performance checks guard initial encoded JavaScript, layout shift, long
  tasks, DOM size and accidental eager boundary downloads. They are regression budgets,
  not a substitute for production field monitoring.
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
keyboard behaviour, semantic page shells and horizontal overflow at 320, 360, 375, 390,
412, 430, 768, 820, 1024, 1280, 1366, 1440, 1600 and 1920 pixels. Captures and failure
traces stay under the configured ignored Playwright output directory.

The performance spec currently enforces practical fixture-environment ceilings of CLS
`<= 0.1`, longest observed main-thread task `< 500 ms`, initial encoded JavaScript below
1 MB and fewer than 1,500 initial DOM nodes on the home/catalogue mobile entry routes. It
also proves those entries make no eager boundary request. These figures are deliberately
coarse cross-environment guards; production Core Web Vitals need real-user or controlled
Lighthouse measurement after hosting, media and analytics are selected.

## External integration boundary

Neither Vitest nor Playwright connects to the project database or Auth0. The backend HTTP
tests inject service doubles, the OIDC protocol tests use a loopback signed issuer, and
the browser tests use the explicit fixture API. They prove application behaviour without
pretending to prove external connectivity or persistence.

The project Atlas environment passed this persistence gate on 2026-09-05: the real health
endpoint reported a connected Mongoose state, and temporary synthetic property and
inquiry records passed create/read/delete checks. The property check used the public
service projection and confirmed private fields stayed excluded. There is intentionally
no public inquiry read endpoint and no production seed command. Use synthetic data only;
never submit a real person's details during verification.

The supplemental responsive request mentions user and admin portals. Those routes do not
exist, so portal UI QA is **not applicable**, not silently passed. The backend staff
authentication boundary now exists; its real provider redirect, passkey assurance and
cookie behavior require the manual development-tenant acceptance pass in
[`auth0-setup.md`](auth0-setup.md). Client accounts and administration remain later work.

## CI

Pull requests run formatting, lint, typecheck, unit/API integration tests, the production
build and Playwright browser acceptance. CI uses the installed Chrome channel with one
worker and retries; local Windows runs use installed Microsoft Edge. Run the complete
gate locally before handoff because a configured workflow is not proof that a particular
unpublished branch has passed remotely.
