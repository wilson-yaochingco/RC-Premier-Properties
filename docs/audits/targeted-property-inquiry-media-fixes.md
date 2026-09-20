# Targeted property, inquiry, and supplied-media fixes

Date: 2026-09-15. Branch: `fix/targeted-property-inquiry-media`.
The initial working tree was clean on `fix/map-home-hero-footer`. No existing work or
stashes were overwritten. Changes remain local and have not been committed or deployed.

## Requested changes and causes

| Request                      | Cause or existing behavior                                                                                                                                            | Result                                                                                                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Admin status colors       | Availability text inherited the general table/notice styling.                                                                                                         | Available uses green `#166534`; Sold uses red `#b91c1c`; both use weight 800 in the admin property list, edit notice, and preview. Reserved styling is preserved.                                                                                                                               |
| 2. Property types            | Commercial and Condominium existed in the historical enum but were excluded from the three-type sale boundary. Industrial was missing.                                | Add Industrial to the existing enum/labels and add shared `SALE_PROPERTY_TYPES` for the original three types plus all three requested types. Apply it to validation, admin authoring/readiness, public list/detail/facets/related discovery, viewing references, and existing dashboard counts. |
| 3. Email and required phone  | `DisabledInquiryNotifier` deliberately performs no delivery. Only viewing submissions required phone on the server; the general form exposed an optional phone field. | Require a valid phone in frontend submit handling and backend validation for every new inquiry type, using existing field errors. Preserve `BUSINESS_NOTIFICATION_EMAIL=rcpremierph@gmail.com`, persisted inquiries, and notification retries. Delivery remains externally blocked.             |
| 4. Parking Space             | The admin label was generated from `parkingSpaces`; public specifications used “Parking.”                                                                             | Display “Parking Space” in create/edit and specification output. Preserve the stored/API key.                                                                                                                                                                                                   |
| 5. Powder Room and Bathrooms | Bathrooms already used `bathrooms`; Powder Room had no field.                                                                                                         | Reuse Bathrooms and add optional `specifications.powderRooms`, with integer validation from 0 to 100, admin authoring, and known-value display. Missing values are omitted; zero is displayed.                                                                                                  |
| 6. Creation feedback         | A success region already existed after the awaited create API call, with “Draft property created.”                                                                    | Use “Property added successfully!” in that existing region. Preserve navigation and show no success during pending or rejected requests.                                                                                                                                                        |
| 7. Image upload error        | Production always selects `UnavailablePropertyMediaStorage`. Its intentional 503 explanation was masked as “Internal Server Error.”                                   | Explicitly expose only the reviewed static storage-unavailable message, keeping HTTP 503. Other production server errors and validation issues remain private. Local validated storage works; durable production uploads remain blocked.                                                        |
| 8. Inquiry overlap           | The desktop filter grid required more width than the staff content region. Separate contact text children also created implicit tracks in responsive table cells.     | Scope a wrapping filter grid and minimum-width rules to inquiries; group contact text in one cell child. Keep the existing table/cards, filters, actions, and data.                                                                                                                             |
| 9. Floor/Level               | The admin label was generated from `storeys`; known storeys were omitted from detail specifications.                                                                  | Display “Floor/Level” in admin authoring and known-value specification output. Preserve `storeys`.                                                                                                                                                                                              |
| 10. Home image               | Home imported the prior hero asset.                                                                                                                                   | Import the exact supplied `home_hero.jpg` through the existing Next Image path. Preserve every media presentation rule.                                                                                                                                                                         |
| 11. About video              | About referenced an external video.                                                                                                                                   | Use local `/media/about_video.mp4`, copied exactly from the supplied file. Preserve poster, seek/start behavior, autoplay, mute, loop, cropping, and reduced-motion handling.                                                                                                                   |
| 12. Home search              | The search component rendered an actions navigation and Home used the prior heading.                                                                                  | Remove only those Buy/Sell/Request a viewing controls and their unused import; set the heading to “Find Your Next Home.” Keep the GET search and its fields.                                                                                                                                    |
| 13. Locations doodle         | A decorative figure occupied the second introduction column and dictated a large fixed-height composition.                                                            | Remove the figure/import, use one full-width existing brand text panel, and let its content determine height with restrained spacing. Keep location cards and the physical doodle asset.                                                                                                        |

## Contracts and existing data

The only new persisted field is optional `specifications.powderRooms`; it has no default.
Industrial extends the existing property enum. Commercial and Condominium keep their
existing stored strings. The existing residential constant/export remains available;
the new sale constant adds the requested supported types without renaming old contracts.
`bathrooms`, `parkingSpaces`, and `storeys` are preserved. No schema for another feature,
database migration, seed data, or existing-document rewrite was added.
Historical inquiries without phone remain readable and retryable.

## Provider status and remaining acceptance

Email: no transactional sender is implemented or configured. The disabled adapter is the
reason no business notification reaches the mailbox; no delivery-loop defect was found.
Actual delivery was not verified. An approved transactional-mail provider, a real adapter
wired at the existing notifier boundary, a verified sender, and backend-only provider
credentials are required. Keep `BUSINESS_NOTIFICATION_EMAIL=rcpremierph@gmail.com`.
The recipient setting does not configure a sender. No Gmail password or provider secret
was introduced. Persisted inquiries survive notification failure, as existing tests prove.

Images: local PNG/JPEG/WebP inspection, private source retention, WebP delivery creation,
and cleanup are verified with real local filesystem operations. The browser upload path
and protected backend services/routes have fixture/injected-service coverage. A durable
production provider is neither implemented nor configured, so production end-to-end
upload/delivery is not verified. It requires an approved storage adapter, private
source/public derivative topology, credentials, owned-object namespace/retention policy,
and live acceptance. Configure matching backend `MEDIA_PUBLIC_ORIGIN` and frontend
`NEXT_PUBLIC_MEDIA_ORIGIN` for the approved HTTPS delivery origin. Those origins alone
cannot enable the unavailable adapter. Local filesystem storage remains prohibited in
production; authentication, origin, CSRF, upload limits, and provenance remain intact.

Live Auth0/MFA and Atlas acceptance were not performed. Existing automated auth/session,
authorization, CSRF, error-privacy, and security coverage passed. No authentication,
MongoDB configuration, deployment, header/navigation, footer, SEO, map presentation,
global branding, dependency, or unrelated product behavior was changed.

## Verification

Commands were run from the repository root using `npm.cmd`/`npx.cmd` on Windows.

| Check                        | Final result                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`       | Passed.                                                                                                                                                                                                                                                                                                           |
| `npm run lint`               | Passed for backend and frontend.                                                                                                                                                                                                                                                                                  |
| `npm run typecheck`          | Passed for shared, backend, and frontend, including Next route type generation.                                                                                                                                                                                                                                   |
| `npm test`                   | 38 test files passed; 410 tests passed.                                                                                                                                                                                                                                                                           |
| `npm run build`              | Passed for all three workspaces. The final E2E command also rebuilt all workspaces successfully.                                                                                                                                                                                                                  |
| `npm run test:e2e`           | 84 tests passed using system Edge; final browser run took 44.3 seconds.                                                                                                                                                                                                                                           |
| Targeted browser inspection  | Available computed as `rgb(22, 101, 52)` and Sold as `rgb(185, 28, 28)`, both weight 800. Admin edit form and visible fields fit 320, 375, 768, 1024, and 1440px without document/body overflow.                                                                                                                  |
| Inquiry responsiveness       | Long contact names/email, filter containment, and cell containment passed at 320, 375, 768, 1024, and 1440px.                                                                                                                                                                                                     |
| Public responsiveness        | Home/About/details passed the existing 320–1920px matrix, including every requested width. Locations passed 320, 375, 390, 768, 1024, 1280, 1440, and 1920px and 200% text reflow.                                                                                                                                |
| Creation/type/specifications | Browser coverage verified all three requested types and known room values after create and edit load, including delayed success and rejected creation. Server/model tests verified persistence validation and public serialization/filtering.                                                                     |
| Image error handling         | Production-mode tests verified the clear storage-unavailable 503 and continued masking of unexpected errors and other dependency errors.                                                                                                                                                                          |
| Media preservation           | Source/destination SHA-256 matches for both supplied files. Home globals, About page CSS, and About experience CSS have identical Git hashes to the original checkout. Local video decoded without a browser media error; reduced-motion coverage passed. Desktop Home/Locations captures were visually reviewed. |
| Diff review                  | `git diff --check` passed; status, file list, and final diff were reviewed. Only requested changes and their direct tests/documentation/assets are included.                                                                                                                                                      |

Initial focused tests and the first browser run exposed old fixture expectations for
the former type boundary, optional phone, and doodle, plus a new ambiguous alert selector.
Those fixtures/selectors were corrected; the final full suites passed.

## Changed files

The complete reviewed file list follows, including this report and the two supplied assets.

- `backend/src/middleware/errorHandler.ts`
- `backend/src/modules/inquiries/inquiry.service.ts`
- `backend/src/modules/inquiries/inquiry.validation.ts`
- `backend/src/modules/operations/admin-operations.service.ts`
- `backend/src/modules/properties/property.model.ts`
- `backend/src/modules/properties/property.service.ts`
- `backend/src/modules/properties/property.types.ts`
- `backend/src/modules/properties/property.validation.ts`
- `backend/src/modules/properties/property-media.storage.ts`
- `backend/test/admin-operations.test.ts`
- `backend/test/api.integration.test.ts`
- `backend/test/inquiry.service.test.ts`
- `backend/test/property.validation.test.ts`
- `backend/test/property-media-upload.test.ts`
- `docs/api/property-administration-api.md`
- `docs/api/public-api.md`
- `docs/architecture/property-media.md`
- `docs/audits/targeted-property-inquiry-media-fixes.md`
- `docs/database/property-and-inquiry-models.md`
- `docs/features/inquiries.md`
- `docs/features/locations.md`
- `docs/features/production-content-and-media.md`
- `docs/features/properties.md`
- `docs/features/property-administration.md`
- `e2e/accessibility-and-responsive.spec.ts`
- `e2e/admin-inquiries.spec.ts`
- `e2e/admin-properties.spec.ts`
- `e2e/client-polish.spec.ts`
- `e2e/public-site.spec.ts`
- `frontend/public/media/about_video.mp4`
- `frontend/src/app/locations/page.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/assets/site/home_hero.jpg`
- `frontend/src/features/about/AboutHeroVideo.tsx`
- `frontend/src/features/admin/admin.module.css`
- `frontend/src/features/admin/AdminInquiryList.tsx`
- `frontend/src/features/admin/AdminPropertyForm.tsx`
- `frontend/src/features/admin/AdminPropertyList.tsx`
- `frontend/src/features/admin/AdminPropertyPreview.tsx`
- `frontend/src/features/home/HeroPropertySearch.tsx`
- `frontend/src/features/inquiries/InquiryForm.tsx`
- `frontend/src/features/locations/locations.module.css`
- `frontend/src/features/properties/property-format.ts`
- `frontend/src/features/properties/property-query.ts`
- `frontend/test/property-format.test.ts`
- `frontend/test/property-query.test.ts`
- `shared/src/api.ts`
