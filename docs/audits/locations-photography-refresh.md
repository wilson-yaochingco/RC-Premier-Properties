# Locations simplification and photography refresh

Completed 2026-11-09 on `feat/locations-photography-refresh`; no commit, push or branch change.

## Result and decisions

- Removed the location detail pages without redirects; old URLs return the global 404.
- Locations keeps its existing editorial layout and dynamic fixture handling. The mosaic
  is a server component with four non-clickable cards, owner-approved local property
  photographs, subject-only alt text, fixed frames, responsive sizes and lazy loading.
  Removed navigation-only arrows, rolling labels, preload, focus styling and hover zoom.
  Adjusted Angeles, Magalang and Porac focal points after reviewing rendered crops.
- Home and footer location navigation use `publicLocationCatalogPath`, which emits the
  existing catalog filter with the short locality name and URLSearchParams encoding.
- Stable, positive-count single-location catalogs own their normalized canonical
  `/properties?location=<short name>`. Sitemap and llms.txt list that same URL;
  unsupported/empty/combined-filter states retain the existing noindex/base-catalog policy.
  `/locations` remains in navigation, footer and sitemap.
- Removed detail-only editorial data, components, styles, search form and tests, plus
  twenty unreferenced locality JPEGs. Retained the About aerial, the San Fernando browser
  fixture image, geographic data and shared modules that still have callers.
- Removed the classic SiteHeader branch that existed exclusively for location guides.
  Old location 404s now use the same public header as other 404s; other routes retain
  their existing header behavior. The existing catalog has no interactive inventory map,
  so its replacement browser coverage checks filtering and absence of the deleted map;
  property detail keeps its approved public-pin map.

## Visible editorial image usage

Audited Home, Locations, About, Properties, Sell, Contact, Book viewing, tour-modal fallback,
404 and legal pages. Counts mean distinct visible sections, excluding listing galleries,
metadata-only uses and filmstrip clones. Twelve secondary assignments changed; no new
assets or dependencies were added, and listing-gallery usages are unchanged.

| Existing image     | Visible sections before                                          | Visible sections after               |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------ |
| `home-hero-3.png`  | Home closer look; About places; About capabilities; Sell gallery | Home closer look; About places       |
| `contact.png`      | Home closer look; About places; About capabilities; Contact      | Home closer look; Contact            |
| `book-viewing.png` | About places; Sell gallery; Book viewing; tour modal             | Book viewing; tour modal             |
| `footer.png`       | Home introduction; About mosaic; About capabilities; 404         | Home introduction; 404               |
| `properties.png`   | Home introduction; About mosaic; Sell introduction               | Home introduction; Sell introduction |
| `location.png`     | Home closer look; About mosaic; Sell gallery                     | Home closer look; About mosaic       |
| `home-hero-2.png`  | Home hero; Home introduction; About mosaic; About capabilities   | Home hero; Home introduction         |

Replacement usage (filenames under their listing's `photography-v1` directory):

| Photograph                                                     | Editorial sections                          |
| -------------------------------------------------------------- | ------------------------------------------- |
| `furnished-brand-new-modern-home-living-room.webp`             | About capabilities; Sell gallery            |
| `modern-filipino-smart-home-exterior-front.webp`               | About mosaic                                |
| `furnished-brand-new-modern-home-stairwell-window.webp`        | About capabilities; Sell gallery            |
| `brand-new-modern-family-home-staircase.webp`                  | About places                                |
| `brand-new-modern-family-home-second-floor-common-area.webp`   | About mosaic                                |
| `modern-filipino-smart-home-room-garden-door.webp`             | About places; Sell gallery                  |
| `brand-new-modern-family-home-bedroom-wardrobe.webp`           | About mosaic                                |
| `furnished-brand-new-modern-home-exterior-front.webp`          | Locations, Angeles tile; About capabilities |
| `modern-filipino-smart-home-living-area.webp`                  | Locations, Mabalacat tile                   |
| `furnished-brand-new-modern-home-kitchen-dining-mezzanine.png` | Locations, Magalang tile                    |
| `brand-new-modern-family-home-exterior-carport.png`            | Locations, Porac tile; About capabilities   |

## Validation

| Command/check                      | Final result                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run format:check`             | PASS                                                                                       |
| `npm run lint`                     | PASS, backend and frontend                                                                 |
| `npm run typecheck`                | PASS, all workspaces                                                                       |
| `npm test -- frontend/test`        | PASS, 28 files and 164 tests; frontend has no separate test script                         |
| `npm run build`                    | PASS, shared/backend/frontend; isolated test origins below                                 |
| Relevant Playwright command below  | PASS, 113 tests, 1.9 minutes, system Edge                                                  |
| `rg -n '/locations/' frontend/src` | PASS: remaining matches are module imports and retained aerial path; no detail-route links |
| `git diff --check`                 | PASS                                                                                       |
| Impeccable detector on changed UI  | PASS, empty finding list                                                                   |

Build environment for browser validation (same origins as the existing e2e build script):

```text
NEXT_PUBLIC_DEPLOYMENT_ENV=test
NEXT_PUBLIC_API_URL=http://127.0.0.1:5051
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100
```

```text
npx playwright test e2e/locations.spec.ts e2e/accessibility-and-responsive.spec.ts e2e/client-polish.spec.ts e2e/home-hero.spec.ts e2e/property-map.spec.ts e2e/public-site.spec.ts e2e/seo.spec.ts --workers=2
```

Browser coverage includes intentional detail 404s, static lazy-loaded tiles, catalog/footer
navigation, canonicals, sitemap/llms.txt, responsive layouts and reduced motion. Locations
full-page screenshots at 1920px and 390px were visually reviewed after the crop adjustment;
other requested widths are captured by the existing specs under
`node_modules/.cache/playwright-test-results/`.

Initial checks exposed stale generated development route types, obsolete detail-specific
browser expectations, a Home header timing flake and a reduced-motion assertion race.
Development types were regenerated through Next dev; browser expectations were updated
for the catalog, the header passed in isolation and the final combined run, and the
reduced-motion check now retries until the rendered color updates. The final command
above exited zero with all 113 tests passing. Existing fixture-image 404 warnings for
`fixture-residence-exterior.webp` and `fixture-residence-living-area.webp` still appear;
the new editorial photographs decode successfully in browser tests.

## Files changed or deleted

M = modified, D = deleted, A = added.

- M: `docs/architecture/brand-and-public-experience.md`
- M: `docs/architecture/geographic-data-and-maps.md`
- M: `docs/features/location-editorial-assets.md`
- M: `docs/features/locations.md`
- M: `docs/features/production-content-and-media.md`
- M: `docs/features/properties.md`
- M: `docs/features/seo-and-social-discovery.md`
- M: `e2e/accessibility-and-responsive.spec.ts`
- M: `e2e/client-polish.spec.ts`
- M: `e2e/home-hero.spec.ts`
- M: `e2e/locations.spec.ts`
- M: `e2e/property-map.spec.ts`
- M: `e2e/public-site.spec.ts`
- M: `e2e/seo.spec.ts`
- D: `frontend/public/images/locations/apalit.jpg`
- D: `frontend/public/images/locations/arayat.jpg`
- D: `frontend/public/images/locations/bacolor.jpg`
- D: `frontend/public/images/locations/candaba.jpg`
- D: `frontend/public/images/locations/floridablanca.jpg`
- D: `frontend/public/images/locations/guagua.jpg`
- D: `frontend/public/images/locations/lubao.jpg`
- D: `frontend/public/images/locations/mabalacat-city.jpg`
- D: `frontend/public/images/locations/macabebe.jpg`
- D: `frontend/public/images/locations/magalang.jpg`
- D: `frontend/public/images/locations/masantol.jpg`
- D: `frontend/public/images/locations/mexico.jpg`
- D: `frontend/public/images/locations/minalin.jpg`
- D: `frontend/public/images/locations/porac.jpg`
- D: `frontend/public/images/locations/san-luis.jpg`
- D: `frontend/public/images/locations/san-simon.jpg`
- D: `frontend/public/images/locations/santa-ana.jpg`
- D: `frontend/public/images/locations/santa-rita.jpg`
- D: `frontend/public/images/locations/santo-tomas.jpg`
- D: `frontend/public/images/locations/sasmuan.jpg`
- M: `frontend/src/app/about/page.tsx`
- M: `frontend/src/app/llms.txt/route.ts`
- D: `frontend/src/app/locations/[location]/not-found.tsx`
- D: `frontend/src/app/locations/[location]/page.tsx`
- M: `frontend/src/app/sell/page.tsx`
- M: `frontend/src/components/layout/SiteFooter.tsx`
- M: `frontend/src/components/layout/SiteHeader.tsx`
- M: `frontend/src/features/about/AboutGallery.tsx`
- M: `frontend/src/features/about/AboutPlaces.tsx`
- M: `frontend/src/features/home/explore-pampanga.ts`
- M: `frontend/src/features/locations/FeaturedLocations.tsx`
- D: `frontend/src/features/locations/LocationEditorial.tsx`
- D: `frontend/src/features/locations/LocationInventoryMap.tsx`
- M: `frontend/src/features/locations/featured-locations.ts`
- D: `frontend/src/features/locations/location-content.ts`
- M: `frontend/src/features/locations/location-seo.ts`
- M: `frontend/src/features/locations/locations-index.module.css`
- D: `frontend/src/features/locations/locations.module.css`
- D: `frontend/src/features/properties/PropertySearchForm.tsx`
- M: `frontend/src/features/properties/property-seo.ts`
- M: `frontend/src/lib/public-location.ts`
- M: `frontend/src/lib/seo.ts`
- M: `frontend/test/explore-pampanga.test.ts`
- D: `frontend/test/location-content.test.ts`
- M: `frontend/test/locations-inventory.test.ts`
- M: `frontend/test/property-query.test.ts`
- M: `frontend/test/public-location.test.ts`
- M: `frontend/test/seo.test.ts`
- A: `docs/audits/locations-photography-refresh.md` (this report)

## Preserved state and limits

The pre-existing line-ending-only changes in PageTransition, PublicChrome, PublicScroll
and AdminShell were not touched. SiteHeader needed route-only cleanup and
LocationInventoryMap was deleted as authorized. Next dev regenerated `frontend/AGENTS.md`
with its heading changed from H1 to H2; it was left alone per the repository instructions.

Skipped the full e2e suite and live production-provider checks, as requested by scope.
Old location detail URLs intentionally return 404; no redirect or production deployment was added.
