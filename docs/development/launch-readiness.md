# Launch readiness — six official listings

Status: **BLOCKED for launch**. Phases 0-4 of the
[Next.js full-stack migration](nextjs-fullstack-migration-plan.md) are implemented on
`feat/nextjs-fullstack-migration`; validation is recorded in that plan. Hosted acceptance,
owner Auth0 verification, production configuration, staff provisioning and owner confirmations
remain gates. Nothing is pushed or deployed by this branch.

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

## Single-app Vercel environment

The [migration plan section 7](nextjs-fullstack-migration-plan.md#7-vercel-project-configuration-for-wilson-at-phase-56)
supersedes the former Vercel frontend to Render API environment instructions. One Vercel
project will serve pages and the Express API at the same origin. This is branch readiness;
Wilson performs staging and production configuration in Phases 5-6. Render remains the
rollback target until Phase 7; do not remove its configuration or existing Auth0 callback yet.

Source of truth: `backend/src/config/env.ts`, `frontend/src/lib/env.ts` and
`frontend/src/lib/next-config-env.cjs`. The sanitized
[`vercel-production.env.example`](vercel-production.env.example) contains placeholders only.
Never commit populated environment files or print secrets.

### Project settings

Use Next.js, Root Directory `frontend`, **include files outside Root Directory** (backend,
shared and root lockfile), install `cd .. && npm ci`, build `cd .. && npm run build:deployment`,
Node 22.x and Fluid Compute. Place the function beside Atlas. Confirm Vercel Pro for the
commercial site. Do not supply a custom start command.

### Production scope

| Variables                                                                                         | Configuration                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEPLOYMENT_ENV`                                                                      | `production`                                                                          |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`                                                     | Both the final HTTPS site origin (`https://rcpremierph.com` at cutover)               |
| `NEXT_PUBLIC_MEDIA_ORIGIN`                                                                        | `https://res.cloudinary.com`                                                          |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT`, `NEXT_PUBLIC_MAP_ATTRIBUTION_URL` | Owner-approved provider/template and attribution; still missing                       |
| `CORS_ORIGIN`, `API_PUBLIC_ORIGIN`                                                                | Both the same HTTPS site origin                                                       |
| `TRUST_PROXY_HOPS`                                                                                | **Measure in Phase 5 and explicitly set before any deployment**; never guess          |
| `AUTH0_ISSUER_URL`, `AUTH0_CLIENT_ID`                                                             | Production confidential Auth0 application                                             |
| `AUTH0_CALLBACK_URL`                                                                              | Site origin + `/api/v1/auth/callback`; add alongside the Render callback              |
| `AUTH_ALLOWED_RETURN_URLS`                                                                        | Site origin + `/` and `/admin`, comma-separated                                       |
| `BUSINESS_NOTIFICATION_EMAIL`, `LOG_LEVEL`                                                        | Confirm inquiry recipient; `info` logging                                             |
| `MEDIA_PUBLIC_ORIGIN`                                                                             | Optional; defaults to `https://res.cloudinary.com` with Cloudinary configured         |
| `MONGODB_URI`                                                                                     | **Sensitive**; TLS URI explicitly naming `rc_premier_prod` and a least-privilege user |
| `AUTH0_CLIENT_SECRET`, `AUTH_SESSION_HASH_SECRET`                                                 | **Sensitive**; production values only, hash secret at least 32 random bytes           |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                            | **Sensitive**, server-only; needed for uploads                                        |

Public values are baked into browser bundles and require a rebuild. All backend values
now belong in the same Vercel project, with secrets marked Sensitive and **never** prefixed
`NEXT_PUBLIC_`. Do not set `NODE_ENV`, `PORT` or `SHUTDOWN_GRACE_SECONDS`; Vercel supplies
`NODE_ENV`, and the listener/shutdown variables do not apply to Functions. Existing auth/MFA
policy defaults remain unchanged.

### Preview scope and release gate

Use the same keys with **staging** values: `NEXT_PUBLIC_DEPLOYMENT_ENV=staging` (noindex),
a fixed staging site/API alias, `rc_premier_staging` and its own user, staging Auth0 callback
and staging Cloudinary configuration. Preview runs with `NODE_ENV=production`, so it needs
the complete server environment. Never point Preview at production providers or data.

Wilson measures `TRUST_PROXY_HOPS` and configures the Vercel Firewall rules for login-start
and inquiry submission described in [deployment guidance](deployment-and-release.md#shared-api-rate-limits-and-vercel-edge-protection).
The MongoDB limiter and the edge rules complement one another. The Atlas network decision,
manual MFA/session/CSRF/logout checks, hosted uploads, timings and rollback rehearsal remain
Phase 5 gates; follow the migration plan before cutover.

### Upload behavior and rollback

The server still accepts and validates up to 12 MiB. The admin client sends files at or below
4 MiB unchanged; larger photos are decoded with orientation, resized to at most 2560 pixels
on the longest edge and encoded as WebP with decreasing quality until they fit, falling
back to JPEG when the browser cannot encode WebP. Failure
shows an error and sends nothing. Production storage is Cloudinary only, with no Vercel
filesystem writes. Direct signed browser-to-Cloudinary uploads remain deferred. The 61
approved photos, 15 derivatives, crops and gallery order are unchanged.

Record the current Vercel deployment and environment names/scopes before configuration.
Keep Render and its callback serving while the migration is verified. Phase 6 cutover changes
both public origins to the site origin; run `npm run smoke:deployment` with both smoke origins
set to it. Instant Rollback restores the previous bundle targeting Render; no data migration
or data rollback is needed. Staff sign in again because host-only cookies change host.

## Pull request preparation

Migration work remains on `feat/nextjs-fullstack-migration` in the fork
`iyawnnn/RC-Premier-Properties`. No push, PR, merge or deployment is authorized by
this readiness document. The migration plan records checks and known failures;
admin corner-radius assertions remain an owner design decision.

## Release sequence

1. Owner confirms locations/specs above; update `rc-premier-listings.ts` and re-run tests.
2. Fresh read-only export of `rc_premier_prod`
   (`npm run ops:export-properties --workspace backend -- --target development --database rc_premier_prod`).
3. Provision the admin staff identity (`auth:provision-admin`) so audit rows are attributed.
4. In the admin UI, update each draft's specifications/location, remove the five excluded
   photos, then publish all six.
5. Verify `GET /properties` returns exactly six published; every gallery image loads.
6. Retire `21` and `60` with `ops:retire-obsolete-listings` (dry run, then `--apply` with the
   fresh backup). It archives, never deletes; the inquiry on `21` stays intact.
7. Confirm `/properties`, detail pages, `sitemap.xml`, canonical URLs and the inquiry in admin.
8. Production single-app Vercel settings to confirm: `NEXT_PUBLIC_MEDIA_ORIGIN` and backend
   `MEDIA_PUBLIC_ORIGIN` both `https://res.cloudinary.com`; the photography derivatives ship in
   `frontend/public/media/properties/photography-v1/` with the frontend build.

## Rollback

- Listings: archived records restore through the staff workflow as unpublished; unpublish any
  of the six the same way. Nothing is hard-deleted.
- Data: restore from the pre-release export; inquiries are never modified by these commands.
- Frontend: Vercel "Instant Rollback" to the previous deployment.

## Remaining launch blockers

1. Hosted migration acceptance: Phase 5 staging, manual Auth0 MFA/session/CSRF/logout,
   measured proxy depth, Vercel Pro, Atlas network access and Wilson's Firewall configuration.
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
