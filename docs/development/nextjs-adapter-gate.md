# Next.js adapter gate - Phase 2

The adapter reuses the existing serverless entry; the Render entry and business logic are unchanged.
Phases 3-4 have not started. Owner Auth0 acceptance remains a separate manual gate.

## Run the isolated proofs

From the repository root, after `npm install` and building shared/backend:

```sh
npm run build --workspace shared
npm run build --workspace backend
npm run test:adapter -- unreachable
npm run test:adapter -- reachable
npm run test:adapter -- dev
```

The script is separate from the existing Playwright suite. It runs real Next CLI production builds
and `next start`, or `next dev`, and uses assert-based HTTP checks for the same-origin pages/API.
The existing e2e fixture API stays on its external origin. Proof servers use 3200/5200; owner
servers on 3000/5000 are not stopped. Dev uses a temporary copy of frontend sources so it does not
share the owner's active `.next/dev` lock.

The reachable and dev modes require an existing OpenSSL executable (Git for Windows's
`C:/Program Files/Git/mingw64/bin/openssl.exe` on Windows), a non-loopback IPv4 address, and the
MongoDB binary downloaded by the test-only `mongodb-memory-server` dependency. They create an
ephemeral CA/server certificate, bind TLS mongod and an HTTPS test proxy only to that one local
address, trust the CA explicitly, and remove their servers, database and temporary files afterward.
No Atlas cluster, real Auth0 tenant, production credentials, hosts/DNS/firewall changes, or
certificate-validation bypass is used. The database is ephemeral `rc_premier`, seeded from one
existing listing and a synthetic staff/session fixture. No real development database was used.

The script verifies listings, detail, facets, map, inquiry submission and persistence, rendered
listing/detail pages, health/readiness, anonymous admin 401, unknown-route 404, malformed raw JSON
400, missing-CSRF 403 with the fixture session, and disallowed-origin logout 403. It prints the
same-origin admin login target without contacting Auth0.

## Bundling and trace decision

The initial prescribed `serverExternalPackages` configuration failed: Turbopack resolved the
workspace symlink to `backend/dist`, bundled it as project source, and attempted to resolve
local-media directories in `property-media.storage.js`. This produced two module-not-found errors
and whole-project filesystem tracing warnings. No backend runtime changes were made.

The coordinator approved the installed Next 16.4.5 ignore-comment mechanism:
`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (Magic Comments) and
`node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md` (Magic Comments).
The adapter's opaque dynamic import leaves backend loading to Node at request time. Automatic
tracing then omitted that import, so `outputFileTracingIncludes` explicitly includes compiled
backend/shared files and their locked runtime dependency closure, scoped only to the API route.
This follows `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`.
No webpack switch, backend bundling, node_modules edits or whole-project trace was used.

The route trace is `frontend/.next/server/pages/api/v1/[...path].js.nft.json`. The proof asserts
`backend/dist/serverless.js`, `shared/dist/api.js`, and package manifests for Express, Mongoose,
openid-client, Cloudinary, sharp and `@vercel/functions` are present, with no `.env` files. It also
prints the compiled backend file listing. The trace preserves the workspace symlinks
`node_modules/rc-premier-backend` and `node_modules/@rc/shared`.

Adding Pages API routing made Next generate nullable compatibility navigation types. Six existing
App Router consumers received minimal null-safe handling; their non-null App Router behavior is
unchanged. This is recorded separately in commit `1660f8b`.

## Header snapshot

Compared real Express-only `createApp()` on 5200 with the adapter's health response in production
and development. Security-header diff: **empty** (header ordering differs only). Helmet overwrites
the overlapping Next page headers, so the page header rule is retained. The production snapshot
below is identical through both paths; dev is identical except HSTS is absent on both:

```json
{
  "content-security-policy": "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "origin-agent-cluster": "?1",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-dns-prefetch-control": "off",
  "x-download-options": "noopen",
  "x-frame-options": "SAMEORIGIN",
  "x-permitted-cross-domain-policies": "none",
  "x-xss-protection": "0",
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()"
}
```

## Production-shaped unreachable database

The backend uses HTTPS placeholder origins, dummy Auth0 values and
`mongodb://adapter.invalid:27017/rc_premier?tls=true`. `.invalid` is intentional: no real Atlas
cluster is contacted. Production build succeeds without importing backend env validation, and
runtime gives the actual responses below. The coordinator amended the original plan: fail-fast
503 takes precedence over route lookup/authentication while the database is unreachable. The
existing production error middleware deliberately hides 5xx messages.

```text
GET /health: HTTP/1.1 200 OK
{"status":"ok","service":"rc-premier-backend","timestamp":"2026-11-08T15:28:31.585Z","uptime":3.97,"environment":"production","database":{"status":"disconnected","readyState":0}}
GET /health/ready: HTTP/1.1 503 Service Unavailable
{"status":"not-ready","service":"rc-premier-backend","timestamp":"2026-11-08T15:28:31.592Z","environment":"production","database":{"status":"disconnected","readyState":0}}
GET /x: HTTP/1.1 503 Service Unavailable
{"status":"error","statusCode":503,"message":"Internal Server Error"}
GET /admin/properties: HTTP/1.1 503 Service Unavailable
{"status":"error","statusCode":503,"message":"Internal Server Error"}
```

## Reachable and development evidence

Both `node e2e/adapter-proof.mjs reachable` and `node e2e/adapter-proof.mjs dev` exited 0.
The production run used `NODE_ENV=production` and an HTTPS same-origin proxy with certificate
verification; the API and rendered pages both reached the adapter. The development run used the
same isolated fixture database approach, not a configured live database. Actual production status
lines:

```text
GET /health: HTTP/1.1 200 OK
GET /properties?page=1&limit=6: HTTP/1.1 200 OK
GET /properties/modern-asian-smart-home-bungalow: HTTP/1.1 200 OK
GET /properties/facets: HTTP/1.1 200 OK
GET /properties/map: HTTP/1.1 200 OK
POST /inquiries: HTTP/1.1 201 Created
GET /health/ready: HTTP/1.1 200 OK
GET /admin/properties: HTTP/1.1 401 Unauthorized
GET /x: HTTP/1.1 404 Not Found
POST /admin/properties: HTTP/1.1 403 Forbidden
POST /inquiries: HTTP/1.1 400 Bad Request
POST /auth/logout: HTTP/1.1 403 Forbidden
PAGE /properties: HTTP/1.1 200 OK; listing rendered
PAGE /properties/modern-asian-smart-home-bungalow: HTTP/1.1 200 OK; listing rendered
PASS adapter gate: reachable
```

Selected actual production response bodies (all fixture data):

```text
GET /health: HTTP/1.1 200 OK
{"status":"ok","service":"rc-premier-backend","timestamp":"2026-11-08T15:34:55.003Z","uptime":2.53,"environment":"production","database":{"status":"disconnected","readyState":0}}
POST /inquiries: HTTP/1.1 201 Created
{"inquiryId":"6af0969f2ad7ce36b0a74edf","status":"received","message":"Thank you for contacting RC Premier Properties. We have received your inquiry and will get back to you using your preferred contact method.","createdAt":"2026-11-08T15:34:55.383Z"}
GET /health/ready: HTTP/1.1 200 OK
{"status":"ready","service":"rc-premier-backend","timestamp":"2026-11-08T15:34:55.417Z","environment":"production","database":{"status":"connected","readyState":1}}
GET /admin/properties: HTTP/1.1 401 Unauthorized
{"status":"error","statusCode":401,"message":"Authentication required."}
GET /x: HTTP/1.1 404 Not Found
{"status":"error","statusCode":404,"message":"Route not found: GET /api/v1/x"}
POST /admin/properties: HTTP/1.1 403 Forbidden
{"status":"error","statusCode":403,"message":"CSRF validation failed."}
POST /inquiries: HTTP/1.1 400 Bad Request
{"status":"error","statusCode":400,"message":"Malformed JSON request body."}
POST /auth/logout: HTTP/1.1 403 Forbidden
{"status":"error","statusCode":403,"message":"Request origin is not allowed."}
```

The anonymous admin page returned 200 and the sign-in target is
`<same-origin>/api/v1/auth/login?returnTo=<encoded same-origin /admin>`; no provider login was
attempted. The missing-CSRF check uses a synthetic session seeded only into the ephemeral database,
and asserts that the property collection is unchanged after the rejected request.

The successful production trace contained 4,666 entries: 140 under `backend/dist`, 8 under
`shared/dist`, and 4,510 node_modules entries (the rest are workspace metadata and Next entrypoints).
Example actual trace entries:

```text
../../../../../../backend/dist/serverless.js
../../../../../../backend/dist/app.js
../../../../../../shared/dist/api.js
../../../../../../node_modules/rc-premier-backend
../../../../../../node_modules/@rc/shared
../../../../../../node_modules/express/package.json
../../../../../../node_modules/mongoose/package.json
../../../../../../node_modules/openid-client/package.json
../../../../../../node_modules/cloudinary/package.json
../../../../../../node_modules/sharp/package.json
../../../../../../node_modules/@vercel/functions/package.json
```

## Milestone validation

Run from the repository root on 2026-11-08:

```sh
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
npm audit --omit=dev --audit-level=high
npx playwright test e2e/client-polish.spec.ts:86 e2e/locations.spec.ts:769 --workers=1
```

| Check                                     | Result                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| `npm run format:check`                    | Pass                                                        |
| `npm run lint`                            | Pass (backend and frontend)                                 |
| `npm run typecheck`                       | Pass (all workspaces, including fresh Next type generation) |
| `npm test`                                | 535 passed across 53 files                                  |
| `npm run build`                           | Pass (shared, backend, Next production build)               |
| `npm run test:e2e`                        | 237 passed, 2 skipped, 4 failed; command exits 1            |
| Isolated browser rerun above              | 2 passed, 0 failed; exits 0                                 |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities; exits 0                                  |

The two persistent browser failures are the unchanged, known admin-radius assertions:
`e2e/admin-inquiries.spec.ts:127` expects a 0px card radius but receives 12px, and
`e2e/admin-operations.spec.ts:287` expects the radius token 0 but receives .75rem.
The other full-run failures were `e2e/client-polish.spec.ts:86` (header sticky state) and
`e2e/locations.spec.ts:769` (equal adjacent scroll-fill samples). Both passed together on the
isolated one-worker rerun (2 passed in 10.0s). This records a full-run animation timing/flakiness
observation, not a claim that those tests are repaired. No existing e2e was changed or weakened.
The existing admin-shell browser test at `e2e/admin-properties.spec.ts:649` also passed; it checks
the actual sign-in link's API origin, login path and encoded return target.

Additional commands used for focused validation:

- One root `npm install`: succeeded, adding the workspace link and test-only MongoDB tooling.
- `npm run build --workspace backend`: passed, emitting the existing serverless entry.
- `npx vitest run backend/test/next-adapter.test.ts`: 1 passed, 0 failed.
- `npx vitest run backend/test/next-adapter.test.ts frontend/test/deployment-config.test.ts frontend/test/beta-deployment.test.ts`: 14 passed across 3 files.
- `node e2e/adapter-proof.mjs unreachable`: final run exited 0.
- `node e2e/adapter-proof.mjs reachable`: final run exited 0.
- `node e2e/adapter-proof.mjs dev`: final run exited 0.
- `git diff --check`: passed.

Exploratory failures were investigated before continuing: the prescribed build bundled backend
source; the opaque import's automatic trace was incomplete; the first placeholder assertion
incorrectly expected the development 503 message instead of production redaction; and early
harness runs needed the memory server's explicit non-loopback URI, reliable child cleanup, and
a temporary dev project outside Next's ignored build/dependency directories. These were resolved
without changing backend behavior. A full-suite attempt first stopped at an ignored coordinator
session file's formatting; the coordinator formatted their own file, and the entire suite above
was then rerun from the start.

Raw local logs (git-ignored) are in `node_modules/.cache/`: `adapter-unreachable.log`,
`adapter-reachable.log`, `adapter-dev.log`, `adapter-milestone.log`, `adapter-e2e-rerun.log`, and
`adapter-audit.log`. All proof-owned listeners, mongod processes and temporary certificates were
stopped/removed. No push, PR, merge or deployment was performed.

## Commits and changed files

- `1660f8b fix(frontend): handle Pages Router navigation compatibility types`: the six navigation
  consumers in PageTransition, PublicChrome, PublicScroll, SiteHeader, AdminShell and
  LocationInventoryMap.
- `98a18aa feat(frontend): mount backend API through Next.js adapter`: `frontend/next.config.mjs`,
  `frontend/package.json`, root `package.json` / `package-lock.json`,
  `frontend/src/pages/api/v1/[...path].ts`, `backend/test/next-adapter.test.ts`, and
  `e2e/adapter-proof.mjs`.
- This focused documentation change: this report and `nextjs-fullstack-migration-plan.md`.

The six frontend files can retain CRLF-only working-tree status markers on this machine; there
is no content diff, and they were left alone as instructed by the coordinator.

## Owner verification and limitations

**REQUIRES OWNER MANUAL VERIFICATION:** Auth0 development MFA login, real session,
CSRF-protected successful write, logout. Synthetic session rejection checks do not satisfy this
provider acceptance gate. No Auth0 login was automated.

Next adds `X-Forwarded-For` on adapter requests; with the explicit local proof setting
`TRUST_PROXY_HOPS=0`, express-rate-limit logs `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` while continuing
to enforce its existing limits. This is reported for the already-planned Phase 3/proxy-trust and
staging measurement work; no trust setting or security protection was changed to hide it.
