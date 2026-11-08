# Next.js full-stack migration plan

Status: **Phases 0-4 implemented; automated milestone recorded with known radius failures and isolated flake reruns; both production adapter proofs passed; owner Auth0 and image-quality acceptance pending.** Implementer: Codex, Phases 0–4.
Phases 5–7 are later deployment activities handled with Wilson. This document is self-contained for
Claude Code and Codex. Read `AGENTS.md` first; its rules apply, especially: ESM `.js` import suffixes in
the backend, API shapes only from `@rc/shared`, no `process.env` reads outside the env modules, and
`npm install` only from the repository root.

## 1. Context

Production today:

| Part    | Where                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------- |
| Website | Next.js App Router on Vercel, `https://rcpremierph.com`                                           |
| API     | Express 5 on Render Free, `https://api.rcpremierph.com`; idles after 15 minutes, then cold-starts |
| Data    | MongoDB Atlas (`rc_premier_prod` production, `rc_premier` development)                            |
| Auth    | Auth0, server-side Authorization Code + PKCE, MFA required, opaque sessions stored in MongoDB     |
| Images  | Cloudinary adapter implemented, production configuration not completed                            |

Goal: one Vercel deployment serving the site **and** `/api/v1/*` on the same origin. Reuse the existing
Express backend unchanged, keep MongoDB Atlas and Auth0, finish Cloudinary, and retire Render only after
production verification.

Verified starting facts (2026-11-08):

- Fork `main` = `e31ef797` (clean). Upstream `main` = `f53b07e`.
- `next` is pinned at **16.3.3** in `frontend/package.json`. `npm audit --omit=dev` reports 7 issues:
  - critical: `next` (fixed in **16.4.5**, outside the pinned version) and `proxy-addr`;
  - high: `body-parser`, `sharp`, `source-map-js`;
  - moderate: `qs`, `ip-address`.
    All except `next` have in-range fixes.
- **Approved photography: 61** = 66 sources − 5 exclusions recorded in
  `docs/development/property-photography/decisions.json` (`_7`: 641476195, 641448645; `_9`: 641298954;
  `_11`: 640389791; `_3`: 639192476 owner-removed duplicate kitchen). There are 15 owner-approved retouched
  derivatives in `frontend/public/media/properties/photography-v1/`, and the delivery crops are Cloudinary
  URL transformations. Both are resolved by `propertyPhotoDeliveryUrl` in
  `frontend/src/features/properties/property-photography.ts`. The production drafts still hold all 66
  originals.
- Cloudinary support is code-complete (`CloudinaryPropertyMediaStorage`,
  `backend/src/modules/properties/property-media.storage.ts`). The 66 originals already exist in cloud
  `dxevthllf` under `rc-premier-properties/listings/<slug>/`. In production without `CLOUDINARY_*`, uploads
  return 503 (the local-disk adapter is development-only).
- `createApp()` (`backend/src/app.ts`) builds the Express app without listening. `backend/src/server.ts`
  adds `listen`, connect-before-listen and graceful shutdown.
- Every frontend API call uses `API_BASE_URL` (`frontend/src/lib/env.ts`), through
  `services/api-client.ts`, `features/admin/admin.service.ts` and `features/admin/AdminShell.tsx`.
  Same-origin is a configuration value, not a code change.
- Next 16 still supports Pages Router API routes, including `bodyParser: false`
  (`node_modules/next/dist/docs/02-pages/03-building-your-application/01-routing/07-api-routes.md`).

## 2. Target architecture

```
Browser ─▶ rcpremierph.com ─┬─ App Router pages (unchanged UI)
                            └─ /api/v1/*  ─▶ frontend/src/pages/api/v1/[...path].ts
                                                 └─▶ handleApiRequest() ─▶ Express createApp()
                                                        ├─ MongoDB Atlas (Mongoose, per-instance reuse)
                                                        ├─ Auth0 (openid-client)
                                                        └─ Cloudinary
```

**Approach:** mount the existing Express app inside Next.js through one Pages Router catch-all API route.
All 31 routes and every service, validator, model, auth module and middleware are reused unchanged. The 23
backend test files keep testing `createApp()` directly.

Rejected alternatives:

- Rewriting the routes as App Router Route Handlers: the middleware stack, raw-body handling, cookies and
  the test harness would all be redone. High risk, no functional gain.
- A second Vercel project for Express: two deployments and a cross-origin API.

Consolidation is **unsuitable**, and the fallback is a paid always-on Render instance or a separate Vercel
backend project, if any of these holds:

- uploads of original files over about 4 MB through the API are a hard requirement;
- the Vercel plan stays Hobby (non-commercial use only; verify on Vercel pricing);
- an open Atlas allowlist is unacceptable and Vercel Static IPs are not purchased.

## 3. Working rules for the implementer

1. Create **`feat/nextjs-fullstack-migration`** from the fork's latest `main`
   (`git fetch origin && git switch -c feat/nextjs-fullstack-migration origin/main`). All work stays on this
   branch, one focused commit per phase step.
2. **No** PRs to `wilson-yaochingco/RC-Premier-Properties`, no merges into upstream `main`, no deploys, and
   no pushes unless the owner asks.
3. Do not touch Render, production MongoDB, Auth0, DNS or the existing Vercel project. Use only the
   development database (`rc_premier`), the in-memory fixture APIs (`e2e/fixture-api.mjs`,
   `e2e/preview-api.mts`) and test values. **No production credentials are needed for Phases 0–4.**
4. Preserve business logic, security protections, the existing tests and public API behavior (status
   codes, JSON bodies, error envelopes, headers relevant to security).
5. Validation cadence:
   - after each change, run the affected tests plus `npm run typecheck` and `npm run lint`;
   - at each milestone (end of Phase 0, the adapter gate after Phase 2, end of Phase 4), run
     `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
     and `npm audit --omit=dev --audit-level=high`.
6. **Stop and report**, without working around it, whenever a phase's stop condition is hit.

## 4. Phases 0–4 (implementation)

### Phase 0: dependency security baseline

Depends on: nothing.

- `frontend/package.json`: `next` `16.3.3` → `16.4.5` (keep the exact pin). Match `eslint-config-next` if it
  is pinned to the same version.
- From the repository root: `npm audit fix` (in-range only; **never** `--force`).
- Re-read `node_modules/next/dist/docs/02-pages/.../07-api-routes.md` after the bump to confirm the
  Pages API behavior relied on in Phase 2.
- The two admin-radius browser failures (`e2e/admin-inquiries.spec.ts:127`,
  `e2e/admin-operations.spec.ts:287`) expect admin `--radius-card: 0`, while the shared token has been
  `0.75rem` since commit 2ea7d03. This is an owner design decision: leave both untouched and report them;
  do not change the design or weaken the tests.

Accept:

- `npm audit --omit=dev --audit-level=high` exits 0.
- The full milestone suite passes, except the two known admin-radius tests.

Stop if: the upgrade changes rendering, routing or tests in ways that need product decisions.

### Phase 1: serverless entry in the backend (Render path unchanged)

Depends on: Phase 0.

- New `backend/src/serverless.ts` exporting
  `handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<void>`:
  - A memoised Express app from `createApp()` (default production dependencies).
  - Memoised connection: `connectDatabase()` from `backend/src/config/database.ts`, then
    `attachDatabasePool(mongoose.connection.getClient())` from `@vercel/functions` (add to
    `backend/package.json` dependencies). A rejected connection clears the memo so the next request retries.
  - **Health routes (`/api/v1/health`, `/api/v1/health/ready`) must not wait for the database.** Every other
    request awaits the connection; on failure it returns the existing 503 error envelope (reuse the error
    middleware's shape via `HttpError`, not a hand-built body). This preserves today's fail-fast
    semantics. (Mongoose command buffering is not disabled in this codebase; do not rely on buffering to
    hide connection failures.)
  - Strip the Next.js API helpers before Express sees the objects (see Phase 2, **Adapter contract**).
    Do it here, so the function is the single, tested entry point.
  - No `listen`, no signal handlers, no `process.exit`.
- `backend/package.json`:
  `"exports": { ".": "./dist/server.js", "./serverless": { "types": "./serverless.d.ts", "default": "./dist/serverless.js" } }`.
  The backend keeps `declaration: false`, so add a hand-written `backend/serverless.d.ts` with that one
  function signature.
- `server.ts` and Render deployment stay exactly as they are.

Tests (`backend/test/serverless.test.ts`):

- one connect per instance, plus a retry after a failed connect;
- health answers without the database;
- non-health routes return the 503 envelope while the database is down;
- a request reaches Express with its contract intact (spin up `http.createServer(handleApiRequest)` and
  exercise it with supertest, using in-memory dependencies as the existing tests do).

Accept: the new tests and all existing backend tests pass; `npm run build --workspace backend` emits
`dist/serverless.js`.

### Phase 2: Next.js adapter (gate: proof of the approach)

Depends on: Phase 1.

- New `frontend/src/pages/api/v1/[...path].ts`:
  ```ts
  import type { NextApiRequest, NextApiResponse } from "next";
  export const config = {
    api: { bodyParser: false, externalResolver: true, responseLimit: false },
  };
  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { handleApiRequest } = await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */
      "rc-premier-backend/serverless"
    );
    await handleApiRequest(req, res);
  }
  ```
  The **dynamic import** keeps backend env validation (`backend/src/config/env.ts`, evaluated at import)
  out of `next build`. The ignore comments also prevent Turbopack from treating the workspace
  symlink's resolved `backend/dist` path as frontend source. Explicit API-only file tracing includes
  compiled backend/shared files and the backend's locked runtime dependency closure; see the
  [Phase 2 gate report](nextjs-adapter-gate.md).
- **Adapter contract** (verified in `next/dist/server/api-utils/node/api-resolver.js`): before Express runs,
  Next defines **own, configurable** properties that would shadow Express 5's prototype methods
  (`express/lib/application.js` sets the prototypes at lines 169–170).
  - Own properties: `req.query` (which also contains the catch-all `path` parameter, so the existing query
    validators would see an unknown key), `req.cookies`, `req.previewData`, `req.preview`, `req.draftMode`,
    `res.status`, `res.send`, `res.json`, `res.redirect`, `res.setDraftMode`, `res.setPreviewData`,
    `res.clearPreviewData`, `res.revalidate`.
  - `handleApiRequest` must `delete` each of these before calling the app.
  - `res.write`/`res.end` are wrapped by Next only for response-size counting. That is harmless with
    `responseLimit: false`; leave it.
  - `req.url` keeps the original `/api/v1/...?...`, which matches `API_PREFIX` in `createApp()`.
- Workspace and build:
  - `frontend/package.json`: add `"rc-premier-backend": "*"`, then run `npm install` from the root
    **only**, so the lockfile updates once.
  - `frontend/next.config.mjs`:
    - `serverExternalPackages: ["rc-premier-backend", "mongoose", "sharp", "express", "openid-client", "cloudinary"]`
      keeps the compiled ESM backend unbundled; it is loaded from `backend/dist` via the workspace symlink.
    - `outputFileTracingRoot` set to the repository root (`path.join(import.meta.dirname, "..")`), so the
      traced function includes `backend/dist`, `shared/dist` and the hoisted `node_modules`.
  - `npm run build:deployment` already builds `shared`, then `backend`, then `frontend`, so `backend/dist`
    exists before Next builds. Vercel needs "Include files outside the Root Directory" enabled (§7).
- Headers: `async headers()` in `next.config.mjs` uses `source: "/:path*"`, which would add page security
  headers (CSP and others) on top of Helmet's API headers. Snapshot the API response headers produced by
  the Express-only server and by the adapter. If they differ in security-relevant ways, exclude `/api/` from
  the page header rule so Helmet stays the single source for API responses.
- Local proof, with no production credentials:
  1. `next dev` same-origin (`NODE_ENV=development`): put backend development variables in the shell (the
     backend reads its own validated env; `dotenv` only loads a `.env` in the current directory) and set
     `NEXT_PUBLIC_API_URL=http://localhost:3000`. Exercise against the development database:
     - public: properties, detail, facets and map, an inquiry submit;
     - admin: Auth0 **development** login with MFA, session, CSRF-protected write, logout.
  2. Production-mode build: `next start` forces `NODE_ENV=production`, so backend production gates apply.
     Use production-shaped placeholder values (HTTPS origins, a syntactically valid TLS Atlas-style URI
     that is unreachable, dummy Auth0 values). Verify:
     - `next build` succeeds and the traced output contains `backend/dist`;
     - `/api/v1/health` returns 200; `/api/v1/health/ready` returns 503;
     - all other paths, including `/api/v1/x` and `/api/v1/admin/properties`, return the existing
       production 503 envelope while MongoDB is unreachable (fail-fast takes precedence).
  3. Reachable production-mode proof: use a TLS-enabled, ephemeral `mongodb-memory-server` instance,
     bound only to this machine's non-loopback address, with runtime-generated test certificates and
     explicit CA trust. Prove listings, detail, inquiry persistence, admin 401 and unknown-route 404
     through `next start`. Never use a real Atlas cluster for these proofs. MFA login, session,
     CSRF-protected write and logout require owner manual verification.
- Tests:
  - an adapter unit test feeding a real `NextApiRequest`-shaped object (with the shadowing properties) and
    asserting the Express semantics: no `path` key in `req.query`, `res.json` and error envelopes
    unchanged, and `__Host-` cookie flags preserved when `secure`;
  - a Playwright project or script that runs the production build same-origin against an in-memory fixture
    service and covers listings, detail, an inquiry and admin 401.
  - Existing e2e stay unchanged: the fixture API remains an external origin, because `NEXT_PUBLIC_API_URL`
    stays configurable.

**Gate:** the full milestone suite plus both proofs above pass. **Stop if** tracing or bundling cannot
include the workspace backend, raw request bodies are consumed before Express, cookies or CSRF behave
differently, error envelopes or security headers diverge, or the Next upgrade changed the API resolver
contract. In that case investigate the root cause and report before continuing; do not start Phases 3–4.

### Phase 3: shared rate limiting and proxy trust

Depends on: the Phase 2 gate.

- New `backend/src/middleware/mongoRateLimitStore.ts` implementing the `express-rate-limit` v8 `Store`
  interface (`init`, `increment`, `decrement`, `resetKey`):
  - an atomic `findOneAndUpdate` with `$inc` and upsert on a `ratelimits` collection;
  - a TTL index on `resetAt`;
  - keys stored as a SHA-256 of the limiter name plus key, never raw IPs.
- `rateLimit.ts`, `loginRateLimit.ts` and `inquiryRateLimit.ts` use this store when `IS_PRODUCTION`. The
  memory store stays for development and tests. Limits, windows and responses are unchanged.
- Keys come from the default `req.ip`, so correctness depends on `TRUST_PROXY_HOPS`. Keep the variable
  explicit. The value for Vercel is measured in staging (Phase 5), never guessed.
- Document Vercel Firewall rate-limit rules as an edge layer (`/api/v1/auth/login`, `POST /api/v1/inquiries`).
  They are configured later by Wilson.

Tests:

- store unit tests: increment, window reset, decrement, `resetKey`, TTL index creation, hashed keys;
- the existing limiter tests run against both stores;
- concurrency: two app instances sharing one store enforce one limit.

Stop if: atomicity cannot be guaranteed with the available MongoDB operations.

### Phase 4: uploads and Cloudinary within the Vercel request limit

Depends on: the Phase 2 gate. It can run in parallel with Phase 3.

- Constraint: a Vercel Function request body is limited to about 4.5 MB (verify the current figure on
  Vercel's Functions limits page). The API contract allows 12 MiB (`MAX_PROPERTY_IMAGE_BYTES`,
  `shared/src/api.ts`).
- **Preserve current behavior until the replacement is validated.**
  - Keep `MAX_PROPERTY_IMAGE_BYTES` at 12 MiB.
  - Keep the authenticated, CSRF-protected `POST /admin/properties/:id/media/uploads` route,
    `inspectPropertyImage` validation and `CloudinaryPropertyMediaStorage` unchanged.
  - Render keeps accepting 12 MiB.
- Add a client-side preparation step in the admin upload flow (the caller of the uploads endpoint in
  `frontend/src/features/admin/admin.service.ts` and its UI):
  - it activates only when the file exceeds a new shared constant `UPLOAD_REQUEST_TARGET_BYTES = 4 * 1024 * 1024`;
  - it decodes with `createImageBitmap` (orientation applied) and re-encodes on a canvas to JPEG or WebP at
    about q0.9 with the longest edge at most 2560 px, stepping quality down until under the target;
  - if it still cannot fit, it shows a clear error and sends nothing.
    Files already under the target are sent byte-for-byte as today. The server still validates every byte.
- Nothing is written to the Vercel filesystem; production storage is Cloudinary only.
- Signed browser-to-Cloudinary upload is **deferred**. It is only needed if full-resolution originals
  become a requirement, and it would need server-side re-validation of the uploaded asset before it is
  attached.
- Cloudinary production configuration is environment only (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`, server-only; `MEDIA_PUBLIC_ORIGIN` defaults to `https://res.cloudinary.com`).
  The 61 approved photos, the crops, the 15 static derivatives and the stored gallery order are unchanged;
  no image is regenerated or re-uploaded.

Tests:

- a unit test for the preparation helper (under target untouched; over target reduced; impossible → error);
- an admin e2e test that uploads a large JPEG against the fixture API;
- the existing upload service tests unchanged and green.

Stop if: the downscaled output fails `inspectPropertyImage`, or quality is unacceptable to the owner.

### Branch deliverable (end of Phase 4)

- All milestone checks pass (except the two known admin-radius tests), and both Phase 2 proofs pass.
- Docs are updated in the same branch: this file's status; `docs/development/launch-readiness.md` and
  `docs/development/vercel-production.env.example` with the single-app environment (§7); a note in
  `docs/development/vercel-beta.md` superseding the separate-API topology.
- Report to the owner. Nothing is pushed or deployed until asked.

## 5. Later phases (with Wilson; not part of the Codex implementation)

- **Phase 5, staging on Vercel Preview:**
  - environment: a separate `rc_premier_staging` database and least-privilege user; a staging Auth0
    callback on the preview's fixed alias; `NEXT_PUBLIC_DEPLOYMENT_ENV=staging`;
  - measure `TRUST_PROXY_HOPS` from the forwarded-header chain;
  - verify MFA login, CSRF, logout, publish visibility, inquiries, uploads to a staging Cloudinary folder,
    and limits across instances;
  - run `npm run smoke:deployment` with both origins set to the preview origin;
  - record p50/p95 timings, cold and warm, against the Render baseline;
  - rehearse Instant Rollback.
- **Phase 6, production cutover:** see §8.
- **Phase 7, Render retirement:** after 7 clean production days, remove the old Auth0 callback, stop
  Render, and delete the `api.rcpremierph.com` DNS record. No permanent compatibility layer is needed: the
  subdomain's only clients are this site and Auth0.

## 6. MongoDB, security and performance notes

- **Connections:** one Mongoose connection per Fluid instance plus `attachDatabasePool`. The existing 5 s
  server-selection and 10 s operation timeouts stay. Place the function region next to the Atlas region.
- **Databases and users:**
  - production `rc_premier_prod` with `rc_premier_prod_app` (`readWrite` on that database only);
  - staging `rc_premier_staging` with its own user;
  - development `rc_premier` with `rc_premier_dev`.
    The production URI must **name `rc_premier_prod`**; the preserved backup URI names `rc_premier`.
- **Atlas network:** Vercel egress is dynamic. Either buy Vercel Static IPs and allowlist them (preferred;
  check plan availability), or use `0.0.0.0/0` with TLS, a long random SCRAM password, the least-privilege
  user and Atlas alerts. Wilson compares this with the current Render allowlist.
- **Auth0 / sessions / CSRF:**
  - Add `https://rcpremierph.com/api/v1/auth/callback` to Allowed Callback URLs **alongside** the existing
    one until Render retires.
  - MFA (`AUTH_REQUIRED_AMR=mfa`), MongoDB sessions, the `__Host-rc_session` and
    `__Host-rc_oidc_transaction` cookies (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`), CSRF
    and the exact-origin check are unchanged.
  - Staff sign in once more after cutover, because host-only cookies are not shared between
    `api.rcpremierph.com` and `rcpremierph.com`.
- **Performance:**
  - Measurable win: the Render Free idle cold start disappears, and the browser→API cross-host hop goes
    away.
  - Must be measured: the function cold start plus the first Atlas TLS connect on a new instance.
  - Not automatic: server-rendered pages still fetch the API over HTTP (now a same-region self-call).
    In-process service calls and CDN caching of public endpoints (with publish invalidation) are separate,
    measured follow-ups.

## 7. Vercel project configuration (for Wilson, at Phase 5–6)

| Setting                              | Value                                                       |
| ------------------------------------ | ----------------------------------------------------------- |
| Framework                            | Next.js                                                     |
| Root Directory                       | `frontend`                                                  |
| Include files outside Root Directory | **On** (`shared/`, `backend/`, root lockfile)               |
| Install                              | `cd .. && npm ci`                                           |
| Build                                | `cd .. && npm run build:deployment`                         |
| Node.js                              | 22.x                                                        |
| Fluid Compute                        | On (default)                                                |
| Function region                      | The Atlas cluster's region                                  |
| Plan                                 | **Pro** (commercial site; Hobby is non-commercial — verify) |

Production environment. Server values must never use `NEXT_PUBLIC_`; this is the former Render set moved
into the one project.

- **Public, build time:**
  - `NEXT_PUBLIC_DEPLOYMENT_ENV=production`
  - `NEXT_PUBLIC_SITE_URL=https://rcpremierph.com`
  - `NEXT_PUBLIC_API_URL=https://rcpremierph.com` (changes from `https://api.rcpremierph.com`)
  - `NEXT_PUBLIC_MEDIA_ORIGIN=https://res.cloudinary.com`
  - `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT`, `NEXT_PUBLIC_MAP_ATTRIBUTION_URL`
    (values still missing)
- **Server config:**
  - `CORS_ORIGIN=https://rcpremierph.com`, `API_PUBLIC_ORIGIN=https://rcpremierph.com`
  - `TRUST_PROXY_HOPS=<measured in Phase 5>`
  - `AUTH0_ISSUER_URL`, `AUTH0_CLIENT_ID`
  - `AUTH0_CALLBACK_URL=https://rcpremierph.com/api/v1/auth/callback`
  - `AUTH_ALLOWED_RETURN_URLS=https://rcpremierph.com/,https://rcpremierph.com/admin`
  - `BUSINESS_NOTIFICATION_EMAIL`, `LOG_LEVEL=info`, optional `MEDIA_PUBLIC_ORIGIN`
- **Server secrets (mark Sensitive):** `MONGODB_URI` (naming `rc_premier_prod`), `AUTH0_CLIENT_SECRET`,
  `AUTH_SESSION_HASH_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Do not set:** `NODE_ENV`, `PORT`, `SHUTDOWN_GRACE_SECONDS` (Vercel sets `NODE_ENV`; the other two
  have no effect).
- **Preview scope:** the same keys with staging values; `NEXT_PUBLIC_DEPLOYMENT_ENV=staging`. Preview
  builds run with `NODE_ENV=production`, so they need the full staging server set.

## 8. Production cutover and rollback (Phase 6, with Wilson)

1. Take a fresh read-only export of `rc_premier_prod` (`npm run ops:export-properties --workspace backend -- ...`).
2. Wilson adds the server variables (they are inert until the API URL changes) and the additional Auth0
   callback.
3. Deploy the reviewed branch's merged `main` with `NEXT_PUBLIC_API_URL=https://rcpremierph.com`. Render
   keeps serving `api.rcpremierph.com` against the same database; there is no schema change.
4. Verify:
   - `npm run smoke:deployment` (both origins `https://rcpremierph.com`);
   - six listings and the 61 photos;
   - an inquiry submitted, then visible in `/admin`;
   - MFA login, publish and unpublish, an upload;
   - the limiter;
   - the 404 and error envelopes.
5. **Rollback:** Vercel Instant Rollback to the previous deployment. Its bundle still targets
   `api.rcpremierph.com`, Render is still running, and the old callback is still allowed. No data was
   migrated, so no data rollback is needed.

## 9. Blockers

### Phase 4 implementation record (2026-11-09)

- Added shared `UPLOAD_REQUEST_TARGET_BYTES` (4 MiB); the server contract remains 12 MiB.
  The admin service prepares only larger files using oriented `createImageBitmap`, a
  2560-pixel longest edge and WebP quality 0.9 down to 0.5. Files at or below the target
  retain their original File object and bytes. Failure is displayed by the existing UI
  before any upload request is created; the bitmap is always released after encoding.
- The upload route, `inspectPropertyImage`, Cloudinary storage and approved photography
  are unchanged. No dependency, filesystem storage or direct signed upload was added.
  Verified Vercel's 4.5 MB body limit on 2026-11-09 against
  [Function limits](https://vercel.com/docs/functions/limitations#request-body-size).
- Unit coverage checks passthrough, orientation/resize, quality stepping and failures.
  The new browser test uses a large EXIF-rotated JPEG and the fixture API's real Express
  upload route and unchanged image inspection, with isolated auth/service doubles.
  Output validated as oriented 1920 x 2560 WebP under 4 MiB; an impossible encode
  displayed its error without issuing another request.
- Updated launch readiness, the placeholder-only environment template and beta topology
  note for one Vercel app. Wilson measures and sets proxy trust before any deployment
  and configures Firewall rules in Phase 5. Phases 5-7 have not started; owner image
  quality acceptance, real Auth0 checks and hosted Cloudinary remain manual gates.
- Validation commands (all from the repository root):
  - `npm run build --workspace shared`: passed.
  - `npx vitest run frontend/test/prepare-property-image.test.ts backend/test/property-media-upload.test.ts`:
    12 passed across 2 files, 0 failed (4 new helper tests; existing validation/storage tests unchanged).
  - `npm run typecheck` and `npm run lint`: passed after implementation.
  - `npm run test:e2e -- e2e/admin-image-upload.spec.ts --workers=1`: 1 passed, 0 failed;
    `npx playwright test e2e/admin-image-upload.spec.ts --workers=1`: final expanded test
    (including impossible encoding/no request) also 1 passed, 0 failed.
  - `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`:
    format, lint, typecheck, all 553 unit/API tests (56 files) and build passed;
    the chain exited 1 at the browser suite: 237 passed, 2 skipped, 5 failed (244 total).
    The two known admin-radius failures remain untouched at `admin-inquiries.spec.ts:127`
    and `admin-operations.spec.ts:287`.
  - `npx playwright test e2e/client-polish.spec.ts:86 e2e/home-hero.spec.ts:111 e2e/properties-catalog.spec.ts:511 --workers=1`:
    all 3 passed, 0 failed (16.3s). Header and hero failures are previously recorded flakes.
    Newly observed catalog flake: the second `.fill()` appended to the prior formatted budget
    (`875000021000000` instead of `21,000,000`) in the four-worker run; it passed unchanged
    in the isolated rerun. This remains a flaky-test observation, not a repaired defect.
  - `npm audit --omit=dev --audit-level=high`: exit 0, zero vulnerabilities.
  - `npm run test:adapter -- unreachable` and `npm run test:adapter -- reachable`: both exit 0.
    Unreachable: health 200, ready 503, other routes retain the fail-fast production 503 envelope.
    Reachable TLS in-memory MongoDB: health/ready 200, public reads/inquiry persistence,
    admin 401, unknown-route 404, malformed JSON 400, CSRF/origin 403 and matching
    Express/adapter security headers. No production services or credentials were used.
  - Final `npm run format:check` and `git diff --check`: passed after the documentation record.
- Changed files: `shared/src/api.ts`; admin `prepare-property-image.ts`, `admin.service.ts`,
  `AdminPropertyMediaManager.tsx`; `frontend/test/prepare-property-image.test.ts`;
  `e2e/admin-image-upload.spec.ts`, `e2e/fixture-api.mjs`; and the four development docs
  `nextjs-fullstack-migration-plan.md`, `launch-readiness.md`, `vercel-production.env.example`,
  `vercel-beta.md`. The fixture API gains optional dependency injection so this browser
  test reaches the real route/inspection with in-memory doubles; its defaults are unchanged.
- Plan deviations: none in Phase 4 implementation. The browser run's new catalog flake and
  isolated rerun are disclosed above; the existing Phase 2 unreachable-DB behavior is retained.
  All proof-owned listeners and temporary MongoDB/TLS resources were cleaned up; the owner's
  3000/5000 listeners remain running. The six pre-existing CRLF-only modifications are not staged.
  No push, PR, merge, deployment, production write or Phase 5-7 implementation occurred.
- Local raw logs (Git-ignored): `node_modules/.cache/phase4-milestone.log`,
  `phase4-upload-e2e.log`, `phase4-upload-e2e-final.log`, `phase4-e2e-rerun.log`,
  `phase4-audit.log`, `phase4-adapter-unreachable.log`, `phase4-adapter-reachable.log`.

### Implementation record (2026-11-08)

- Phase 3: production API, login-start and inquiry limiters now share the MongoDB
  `ratelimits` collection with namespaced SHA-256 keys, a TTL index and a single atomic
  window-reset/increment pipeline (`$add`, the pipeline equivalent of `$inc`). Development
  and tests retain memory defaults. Limits, responses and explicit proxy trust are unchanged.
  Two application instances enforce one inquiry budget; limiter assertions run against both stores.
  Vercel Firewall login/inquiry rules are documented in
  [deployment guidance](deployment-and-release.md#shared-api-rate-limits-and-vercel-edge-protection)
  for Wilson to configure later. Measure `TRUST_PROXY_HOPS` before any deployment: the
  Vercel socket peer is the platform, so a zero-hop setting shares one bucket across clients.
  Validation: 106 affected tests and all 549 unit/API tests (55 files) passed; workspace
  typecheck, lint and targeted formatting passed. Full build/e2e remain the Phase 4 milestone;
  the two known admin-radius browser failures are untouched.

- Phase 2: added the Pages API adapter with body parsing disabled, opaque runtime backend import,
  API-only workspace/runtime dependency tracing, and a request-contract/cookie unit test. Production
  and isolated dev same-origin proofs passed against TLS in-memory MongoDB; unreachable-placeholder
  production responses preserve fail-fast 503 behavior. Security-header snapshots match Express,
  so the page header rule is retained. See the [gate report](nextjs-adapter-gate.md) for captures,
  trace evidence, coordinator-approved plan adjustments, commands and owner-manual items.
- Phase 2 milestone: formatting, lint, workspace typecheck, 535 unit tests and production build
  passed. Full browser suite: 237 passed, 2 skipped, 4 failed. The header and location scroll-fill
  failures passed together on an isolated one-worker rerun (2 passed); the two known admin-radius
  failures remain unchanged. Production audit: zero vulnerabilities. Auth0 MFA login, real session,
  successful CSRF-protected write and logout require owner verification; Phase 3 is recorded above and Phase 4 validation is recorded separately.

- Phase 1: added the backend serverless export with a reused Express app, shared/retryable MongoDB connection and Vercel pool attachment. Health bypasses connection startup; other requests fail with the existing 503 envelope while MongoDB is unavailable. Next API helpers are removed before Express runs. The Render entry is unchanged; the Next adapter is not implemented yet.
- Phase 1 checks: 372 backend tests across 24 files passed (including 4 new serverless tests); backend build emitted `dist/serverless.js`; workspace typecheck, lint and targeted formatting passed. Production dependency audit reports zero vulnerabilities. Full browser/milestone checks remain for the Phase 2 gate; the two known admin-radius failures are untouched.
- Phase 0: pinned `next` and `eslint-config-next` to 16.4.5; ran root `npm install` and in-range `npm audit fix`. Production dependency audit at high severity reports zero vulnerabilities. Next 16.4.5 still documents Pages API `bodyParser: false`, `externalResolver`, and `responseLimit: false`.
- Phase 0 checks: format, lint, typecheck, 530 unit tests, and build passed. Full e2e: 236 passed, 2 skipped, 5 failed. Two failures are the known admin-radius assertions. The other three (`admin-operations` responsive matrix, `client-polish` public header, and `home-hero` interaction) passed together on an isolated rerun with one worker. Their full-run timing remains an unresolved flaky-test observation; no product or assertion change was made.

**Technical migration readiness (Phases 0–4 and the Phase 5 gate)**

- The Next 16.4.5 upgrade and the audit fix
- The admin-radius decision (reported, not changed)
- The adapter gate
- Shared rate limiting
- The upload preparation step
- Then, for Phase 5: a staging database and user, a staging Auth0 callback, the Vercel Pro decision, the
  Atlas network decision, and the `TRUST_PROXY_HOPS` measurement

**Final production launch readiness**

- Production values: the map provider and attribution, Auth0 production secrets, and a `MONGODB_URI`
  naming `rc_premier_prod`
- Cloudinary credentials on Vercel
- Staff identity provisioning (Auth0 subject → `npm run auth:provision-admin --workspace backend`)
- Reconcile the six drafts: the `_3` and `_8` specifications, and removing the 5 excluded photos from the
  production galleries
- Publish the six
- Retire legacy listings 21 and 60 with `ops:retire-obsolete-listings` (it archives; the inquiry on 21 is kept)
- Verify existing inquiries are intact
- Owner confirmations: the `_11` bathroom total, the `_8` claims, and the inquiry mailbox

## 10. Acceptance criteria

- One Vercel deployment serves the pages and `/api/v1/*`; Render carries no production traffic after Phase 6.
- Existing backend supertest suites pass unchanged. API status codes, bodies and error envelopes are
  identical through the adapter.
- Auth0 MFA login, sessions, CSRF, the origin check, roles and `__Host-` cookie flags behave exactly as
  before. Rate limits hold across instances, and no raw IPs are stored.
- Published-only visibility, the six listings and 61 approved photos, filters, SEO, sitemap and inquiries
  work in production.
- Uploads: files under 4 MiB are sent unchanged; larger photos are prepared client-side, validated
  server-side and stored in Cloudinary; nothing touches the Vercel filesystem.
- `npm audit --omit=dev --audit-level=high` is clean. No credential is in a `NEXT_PUBLIC_` variable or a
  tracked file.
- Instant Rollback is rehearsed in staging. Measured p95 for listings beats the Render Free baseline, and
  the idle cold start is gone.

## 11. Complexity and risks

Medium: about 5 new or changed core files, plus the upload helper and tests; roughly 3–5 days of
implementation, then staging.

| Risk                                             | Mitigation                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Next helpers shadow Express methods              | Strip them in `handleApiRequest`; adapter test                   |
| Tracing or bundling of the workspace ESM backend | `serverExternalPackages` + `outputFileTracingRoot`; Phase 2 gate |
| Env validation at build time                     | Dynamic import in the adapter                                    |
| Duplicate page headers on the API                | Header snapshot; exclude `/api/` if needed                       |
| Cold start + Atlas connect latency               | Fluid reuse, region placement, measurement                       |
| ~4.5 MB request limit                            | Client preparation above 4 MiB; 12 MiB contract unchanged        |
| Per-instance limits                              | MongoDB store + Vercel Firewall                                  |
| Wrong proxy-hop count                            | Measured in staging                                              |
| Atlas exposure                                   | Static IPs, or a least-privilege user with TLS and alerts        |
| Hobby plan terms                                 | Pro before production                                            |
