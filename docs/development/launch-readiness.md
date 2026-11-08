# Launch readiness — six official listings

Status: **BLOCKED**. Engineering is ready for a pull request, but launch needs the items in
[Remaining launch blockers](#remaining-launch-blockers): a dependency security update, missing
production configuration, the staff identity, and owner confirmations. No commit, push, pull
request, deployment, or production write has been made by this preparation.

## Location audit

The owner confirmed all six cities on 2026-11-08, so the earlier placeholders are now
verified: #3 Mabalacat City, #7 City of San Fernando, #8 Porac, and #9, #10 and #11 Angeles City
(all Pampanga). No barangay, street address or coordinate was supplied, so none is shown;
listings stay city-level. The repository source (`rc-premier-listings.ts`) already carried
these cities. The production drafts match, so no location write is needed.

## Specification reconciliation

Source captions were compared field by field with `rc-premier-listings.ts` and the production
draft export (`backend/backups/rc_premier_prod-2026-11-08T06-56-21-136Z.json`).

- Titles, prices (₱), lot and floor areas, parking, storeys, amenities, features: **match** for
  all six. Currency is stored as PHP by default.
- **Drift to reconcile before publishing** (production drafts were imported before the
  presentation correction; the repository source is the corrected one):
  - `_3`: the owner confirmed 4 bedrooms and, as bathrooms, two en suites plus the maid's
    bath (3), with the powder room counted separately. Source now carries `bathrooms: 3`;
    production has no bathroom count.
  - `_8`: the owner confirmed 3 bedrooms and 3 toilets and baths plus a powder room. Source
    and production now agree on the numbers; the description text differs and needs the
    corrected copy.
  - `_11`: production has `bathrooms: 2`; the caption states no total (ground-floor bath,
    common bath, master bath not stated). Source omits it.
- **Photos:** production drafts hold 66 images; the approved catalog is now 61 (the owner removed
  one near-duplicate kitchen view, `639192476`, from `_3`: 16/8/10/9/9/9 for `_3/_7/_8/_9/_10/_11`). The four excluded views (two on `_7`, one each on
  `_9` and `_11`, per `decisions.json`) must be removed from the galleries via the staff workflow
  (Cloudinary originals stay untouched) or the drafts re-imported.
- **Owner confirmation still needed:** `_11` bathroom total; the Jeju-brick, karaoke and
  Korean-foyer claims on `_8` (not visible in photos; worded "according to the listing").

## Removed

The development-only Preview toolbar (`DevHomepagePreview`, `HomepagePreviewSwitcher`, its
styles and the five page mounts). It was already compiled out of production; an existing e2e
assertion (`locations.spec.ts`) confirms it is absent. The `?…Fixture=` query hooks it drove
remain, guarded by `NODE_ENV === "development"`, with their unit tests; removing them is a
separate cleanup.

## Repository cleanup (pre-PR)

Removed (all untracked and git-ignored, so none was ever in the PR):

- `backend/.env.backup-before-dev-user` and `backend/.env.backup-before-prod-import`: byte-identical
  to the active `backend/.env`, so they held nothing unique.
- `.playwright-mcp/`: browser-tool console logs.

Kept, deliberately:

- `backend/.env` and `frontend/.env.local`: the active development configuration.
- `backend/.env.backup-before-standard-uri` and `backend/.env.backup-yao-srv-uri`: each holds a
  **unique** MongoDB URI that exists nowhere else, including the production Atlas user. Move them
  into a password manager or the Render secret store, confirm the active file still works, then
  delete them. They are git-ignored and cannot enter the PR.
- `.impeccable/` and `frontend/.impeccable/`: ignored design-tool caches; harmless, not in the PR.
- Preview fixtures (`e2e/preview-api.mts`, `e2e/fixture-api.mjs`), the import, export and retirement
  scripts, and the photography utilities (`scripts/review-property-photography.mts`,
  `scripts/prepare-property-photo-trials.py`): needed for the six-listing catalog and 61-photo pipeline.

Findings: no credentials are tracked or present in Git history (only `.env.example` templates are
tracked). Secret-pattern hits in tests and docs are placeholders. Two new files are required by the
About page and are still untracked, so they must be added to the PR:
`frontend/src/assets/site/bungalow-exterior.jpg` and `bungalow-street.jpg`.

## Environment variables

Source of truth: `backend/src/config/env.ts`, `frontend/src/lib/env.ts` and
`frontend/src/lib/next-config-env.cjs`. Names only; never paste values into docs or logs.

### Vercel (frontend), Production scope, build time

All are public `NEXT_PUBLIC_*` values embedded in browser bundles. There are **no** frontend secrets.
Backend secrets must never be added to Vercel.

| Variable                           | Production value                                  | Status                              |
| ---------------------------------- | ------------------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_DEPLOYMENT_ENV`       | `production` (hosted builds reject anything else) | Ready                               |
| `NEXT_PUBLIC_MEDIA_ORIGIN`         | `https://res.cloudinary.com`                      | Ready; equals `MEDIA_PUBLIC_ORIGIN` |
| `NEXT_PUBLIC_SITE_URL`             | Final HTTPS frontend origin                       | **Missing**; equals `CORS_ORIGIN`   |
| `NEXT_PUBLIC_API_URL`              | Final HTTPS API origin, same registrable site     | **Missing**; build fails without it |
| `NEXT_PUBLIC_MAP_TILE_URL`         | Approved tile template with `{z}`, `{x}`, `{y}`   | **Missing**; build fails without it |
| `NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT` | Plain-text attribution                            | **Missing**                         |
| `NEXT_PUBLIC_MAP_ATTRIBUTION_URL`  | HTTPS attribution link                            | **Missing**                         |

Vercel supplies `VERCEL` and `VERCEL_ENV` itself. The local-only file
`frontend/.env.vercel-production.local` carries the two ready values and the missing ones as
comments; it is labelled INCOMPLETE and is git-ignored. A sanitized template is tracked at
[`vercel-production.env.example`](vercel-production.env.example). Preview deployments need their
own scope with `NEXT_PUBLIC_DEPLOYMENT_ENV=staging` (this also blocks indexing).

### Render (persistent Express API), runtime

| Variable                                                                                                                                    | Kind                 | Notes                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`                                                                                                                                  | config               | `production`                                                                  |
| `CORS_ORIGIN`                                                                                                                               | config               | Exactly the final frontend origin                                             |
| `API_PUBLIC_ORIGIN`                                                                                                                         | config               | Exactly the final API origin (HTTPS)                                          |
| `TRUST_PROXY_HOPS`                                                                                                                          | config               | Explicit, verified hop count; never inferred                                  |
| `MONGODB_URI`                                                                                                                               | **secret**           | TLS Atlas URI that **names `rc_premier_prod`** explicitly                     |
| `AUTH0_ISSUER_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CALLBACK_URL`, `AUTH_ALLOWED_RETURN_URLS`                                                     | config               | Production Auth0 application; callback = API origin + `/api/v1/auth/callback` |
| `AUTH0_CLIENT_SECRET`, `AUTH_SESSION_HASH_SECRET`                                                                                           | **secret**           | Separate from development; hash secret at least 32 random bytes               |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                                                      | secret (key, secret) | All three or none; needed for admin photo upload                              |
| `MEDIA_PUBLIC_ORIGIN`                                                                                                                       | config, optional     | Defaults to Cloudinary when configured; must match the frontend value         |
| `BUSINESS_NOTIFICATION_EMAIL`                                                                                                               | config               | Recipient only (default `rcpremierph@gmail.com`)                              |
| `AUTH_REQUIRED_AMR`, `AUTH_SESSION_IDLE_MINUTES`, `AUTH_SESSION_ABSOLUTE_HOURS`, `AUTH_MAX_CONCURRENT_SESSIONS`, `AUTH_TRANSACTION_MINUTES` | policy, optional     | Defaults are the production limits                                            |
| `PORT`, `LOG_LEVEL`, `APP_BUILD_ID`, `SHUTDOWN_GRACE_SECONDS`                                                                               | optional             | `LOG_LEVEL` must not be `debug`                                               |

Development-only and never to be copied to production: `MONGODB_URI` pointing at `rc_premier` or the
`rc_premier_dev` user, any `localhost` origin, the development Auth0 tenant/application, and
`e2e/preview-api.mts` (a database-free fixture server). A production-shaped build
(`NEXT_PUBLIC_DEPLOYMENT_ENV=production`, HTTPS placeholder origins) was verified: it succeeds, bakes in
only the configured API origin, and its output contains no preview-API port, no toolbar code, and no
reachable localhost reference (the remaining strings are unreachable development fallbacks).

Two warnings found while auditing:

- The preserved production URI (`rc_premier_prod_app`) names the default database `rc_premier`.
  The production data lives in `rc_premier_prod`, so the URI must be edited to name it, and the user's
  privileges on that database confirmed before use.
- `vercel-beta.md` still says the public contact is `rcpremierph@gmail.com`; the site uses
  `rcpropertiesss@gmail.com` (`public-contact.ts`). Decide whether inquiries should be delivered to the
  new address (`BUSINESS_NOTIFICATION_EMAIL`).

## Vercel environment checklist

The RC Premier Vercel project was not visible to the audit account, so its current variables are
unknown. Export the project's variable names and scopes from the dashboard first and apply the rules
below to each. **Never blind-reset**: add and update first, remove last, and keep the previous
deployment available for rollback. The frontend reads exactly seven variables (verified against
`frontend/src/lib/env.ts`, `next-config-env.cjs` and every `process.env` read in `frontend/src` and
`scripts`); `VERCEL`, `VERCEL_ENV` and `NODE_ENV` are supplied by the platform and are not set by hand.

### Before changing anything

1. Record the current production deployment URL (the rollback target).
2. Export the existing variable names and scopes (keep any download in a password manager, not the repo).
3. Confirm project settings still match [vercel-beta.md](vercel-beta.md#vercel-project-settings): Root
   Directory `frontend` with files outside it included, install `cd .. && npm ci`, build
   `cd .. && npm run build:deployment`, Node 22. `build:deployment` fails unless
   `NEXT_PUBLIC_DEPLOYMENT_ENV` is `staging` or `production`.

### Production scope: variables to set

Rule for every row: **absent: add. Present with a different value: update. Present and equal: retain.**

| Variable                           | Value to set                                  | Source / status                           |
| ---------------------------------- | --------------------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_DEPLOYMENT_ENV`       | `production`                                  | Code-defined; in the local file           |
| `NEXT_PUBLIC_MEDIA_ORIGIN`         | `https://res.cloudinary.com`                  | Active local config; in the local file    |
| `NEXT_PUBLIC_SITE_URL`             | Final HTTPS frontend origin                   | **MISSING** (no domain recorded anywhere) |
| `NEXT_PUBLIC_API_URL`              | Final HTTPS API origin, same registrable site | **MISSING**                               |
| `NEXT_PUBLIC_MAP_TILE_URL`         | Approved template with `{z}`, `{x}`, `{y}`    | **MISSING** (no approved provider)        |
| `NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT` | Provider's plain-text attribution             | **MISSING**                               |
| `NEXT_PUBLIC_MAP_ATTRIBUTION_URL`  | Provider's HTTPS attribution link             | **MISSING**                               |

Constraints enforced by the build: every origin is HTTPS with no path, query, credentials or localhost;
the tile URL must contain all three placeholders. Setting `NEXT_PUBLIC_DEPLOYMENT_ENV=staging` on
Production is accepted but adds `noindex`, so use `production`. `NEXT_PUBLIC_SITE_URL` is not enforced by
the build; omit it and canonicals and the sitemap are silently dropped.

### Preview scope

The same seven keys, with `NEXT_PUBLIC_DEPLOYMENT_ENV=staging` (required for Preview, and it blocks
indexing) and non-production origins. Do not point Preview at the production API.

### Remove, eventually

Only **after** the new production deployment is verified. These are backend values and have no place on
Vercel: `MONGODB_URI`, `AUTH0_*`, `AUTH_*`, `CLOUDINARY_*`, `CORS_ORIGIN`, `API_PUBLIC_ORIGIN`,
`TRUST_PROXY_HOPS`, `MEDIA_PUBLIC_ORIGIN`, `BUSINESS_NOTIFICATION_EMAIL`, `PORT`, `LOG_LEVEL`,
`APP_BUILD_ID`, `SHUTDOWN_GRACE_SECONDS`, plus any `NEXT_PUBLIC_*` name not in the table above. If any
backend secret was ever on Vercel, rotate it after removal.

### Order of operations

1. Prepare Render first (same values, see the Render table above) so the API accepts the new frontend
   origin; its `CORS_ORIGIN` must equal `NEXT_PUBLIC_SITE_URL` and its `API_PUBLIC_ORIGIN` must equal
   `NEXT_PUBLIC_API_URL`.
2. Set the Vercel Production variables. They take effect only for a **new** build.
3. Merge the PR (or redeploy) and let Vercel build; a missing origin or map URL fails the build with a
   named error, which leaves the live deployment untouched.
4. Update the Auth0 callback, allowed return URLs and logout URLs to the final origins.
5. Verify, then run the read-only smoke check from your shell (not Vercel):
   `SMOKE_FRONTEND_ORIGIN=<frontend origin> SMOKE_API_ORIGIN=<api origin> npm run smoke:deployment`.
   Also confirm `/properties` lists exactly six, images load from Cloudinary, `sitemap.xml` and
   canonicals use the final origin, and an inquiry reaches `/admin`.
6. Remove the obsolete variables above.

### Rollback

Vercel Instant Rollback to the recorded deployment restores that deployment's build-time values. If the
new variables were wrong, restore the exported set and redeploy. The previous deployment is never
deleted.

## Pull request preparation

- Fork `origin` (`iyawnnn/RC-Premier-Properties`) to `upstream` (`wilson-yaochingco/RC-Premier-Properties`).
  The branch `feat/public-pages-editorial-redesign` is 0 commits behind `upstream/main` and a trial merge
  reports no conflicts. The work is still uncommitted; follow [git workflow](git-workflow.md).
- The PR adds the dependencies `cloudinary` (backend) and `gsap`, `@gsap/react`, `lenis` (frontend).
- CI (`.github/workflows/ci.yml`) will currently **fail** on two things: the `npm audit` step and two
  admin-radius browser tests (see blockers). Fix or consciously waive them before requesting review.

## Test acceptance status

- Passing: format, lint, typecheck, build, 530 unit tests, and a production-shaped deployment build.
- Browser suite: 236 passed, 2 skipped, 5 failed. The skip is the opt-in soak test
  (`CLOSER_LOOK_SOAK`). Three failures (`admin-operations:448`, `client-polish:86`, `home-hero:111`) are load
  flakes that pass when run alone (CI runs one worker with retries). Two are real:
  `admin-inquiries:127` and `admin-operations:287` expect admin `--radius-card` to be `0`, but the shared token
  has been `0.75rem` since commit 2ea7d03. Either restore square admin corners or update the assertions; that is
  a design decision, not a defect in the public site. Acceptance is therefore **not** complete.

## Release sequence

1. Owner confirms locations/specs above; update `rc-premier-listings.ts` and re-run tests.
2. Fresh read-only export of `rc_premier_prod`
   (`npm run ops:export-properties --workspace backend -- --target development --database rc_premier_prod`).
3. Provision the admin staff identity (`auth:provision-admin`) so audit rows are attributed.
4. In the admin UI, update each draft's specifications/location, remove the four excluded
   photos, then publish all six.
5. Verify `GET /properties` returns exactly six published; every gallery image loads.
6. Retire `21` and `60` with `ops:retire-obsolete-listings` (dry run, then `--apply` with the
   fresh backup). It archives, never deletes; the inquiry on `21` stays intact.
7. Confirm `/properties`, detail pages, `sitemap.xml`, canonical URLs and the inquiry in admin.
8. Production Vercel/Render settings to confirm: `NEXT_PUBLIC_MEDIA_ORIGIN` and backend
   `MEDIA_PUBLIC_ORIGIN` both `https://res.cloudinary.com`; the photography derivatives ship in
   `frontend/public/media/properties/photography-v1/` with the frontend build.

## Rollback

- Listings: archived records restore through the staff workflow as unpublished; unpublish any
  of the six the same way. Nothing is hard-deleted.
- Data: restore from the pre-release export; inquiries are never modified by these commands.
- Frontend: Vercel "Instant Rollback" to the previous deployment.

## Remaining launch blockers

1. **Dependency security (blocks CI and production).** `npm audit --omit=dev --audit-level=high`
   reports 7 vulnerabilities (2 critical, 3 high, 2 moderate). The critical `next@16.3.3` advisories
   (image-optimization RCE/SSRF, cache poisoning) affect the Vercel frontend; the fix needs `next` 16.4.5,
   because the version is pinned exactly in `frontend/package.json`. Verified not yet applied: every local
   and remote branch still pins `next` 16.3.3. `express` transitives (`body-parser`,
   `proxy-addr`, `qs`), `ip-address`, `sharp` and `source-map-js` have in-range fixes through
   `npm audit fix`. Apply, rebuild and re-run the suites, preferably as its own reviewed change.
2. Missing production configuration: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, the three map variables,
   the production Auth0 application and secrets, and the production `MONGODB_URI` naming `rc_premier_prod`.
3. Staff identity not provisioned (needs the Auth0 subject), so changes are unattributed.
4. Owner confirmations: `_11` bathroom total; Jeju-brick, karaoke and Korean-foyer wording on `_8`;
   which mailbox receives inquiries.
5. The six drafts still need the corrected specifications, the removal of the five excluded photos
   (four earlier plus the owner-removed duplicate kitchen on `_3`), publication, and then retirement of
   legacy listings 21 and 60.
6. Two admin-radius test failures (above).
7. The two unique `.env.backup-*` credentials must be secured before they are deleted.
