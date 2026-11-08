# Public Locations

Status: curated four-location index, inventory-backed detail routes and the final
responsive scenery presentation are implemented. Real production property inventory
remains external. Last reviewed 2026-11-07.

## Routes and source of truth

- `/locations` presents four **curated** destinations (Angeles City, Mabalacat City,
  Magalang, Porac). They are permanent navigation targets and are always shown and linked,
  whatever the inventory says. Showcase homes come from the backend.
- `/locations/[location]` resolves a stable lowercase slug to a current facet value, or to
  one of the four curated locations when it has no published properties yet (count 0).
  Any other slug returns the public not-found surface.

There is no manual popular-location ranking, neighborhood copy, market statistic or
invented count. Curated descriptions use only the locality's classification, its position
on the Pampanga map and its documented photograph's caption.

## Index composition

The page uses the shared ivory ground and ends with the unchanged `EditorialCta` and global footer.

1. Full-bleed dedicated Locations video hero, with three fixed Manrope headline lines
   low on the left and supporting copy on the lower right. The existing shared video
   behavior provides muted inline autoplay, looping, a neutral loading background and
   a paused first frame for reduced motion. There is no portrait or photographic fallback.
   The 11.3-second master is preserved outside the repository; `/media/locations-hero.mp4`
   is a silent 1080p/30fps H.264/yuv420p fast-start copy of about 6.02 MB.
2. Broad, four-line community statement using the Homepage `ScrollFillText` and
   `useScrollFill` pattern. All letters fill in one reversible scroll progression with
   no entrance timeline or masking. Desktop Manrope is 86.4?90px with optical scaling
   to retain four lines at 1440px; the eyebrow is 16?18px. Mobile wraps naturally.
   Reduced motion and no-JavaScript rendering show the full text immediately.
3. The unchanged asymmetric four-location photographic mosaic. Every tile contains its
   location, factual description and `Explore location` action. Attribution remains on
   the detail pages and in the asset documentation.
4. `Homes worth exploring` uses `FeaturedPropertiesSection` with its Locations variant:
   the same featured-sale API query, inventory loader, cards, skeleton and hydration gate
   as Home. It caps output at three and adds the Locations heading/action. Home's default
   markup, copy, appearance and count remain unchanged. Empty/unavailable states reuse
   Home's contact-focused copy without replacing the Locations heading with an error.
5. Explicitly bound Manrope three-line 72px/75.6px guidance headline at wide desktop and three numbered 36?42px
   statements. A 28% number column provides consistent separation from titles. Content
   reveals leave separators stationary. Mobile editorial headings, guidance rows and section actions center; hero, mosaic
   overlays and property metadata keep their approved left alignment.
6. Existing closing `EditorialCta` and global footer.

The cinematic headline and supporting paragraph stack at the bottom of the mobile hero.
Reduced motion shows all content immediately. Empty and unavailable collection states
remain compact, with existing catalog/contact navigation and retry behavior.

Search and filtering remain on `/properties`; the index no longer has a search form.

## Showcase

The index now consumes the same bounded featured-sale query as the Homepage rather
than combining four city requests. Both routes share `loadFeaturedInventory`,
`FeaturedPropertiesSection`, `FeaturedPropertiesShowcase`, `FeaturedGridSkeleton` and
`FeaturedInventoryState`. There are no synthetic production records or padding to fill
slots. Locations-specific styling is scoped to the shared section's Locations variant.

## Development previews

The existing development toolbar scenarios remain: `Real`, `0`, `1`, `2`, `4`, `Many`,
`Error`. `4` and `Many` supply more than three illustrative homes to prove the three-property cap;
`Many` retains a larger collection total. Fixture cards use Homepage fixture media and show no disclaimer text on the page.

Fixtures remain behind the literal development-only dynamic import. Production ignores
fixture parameters, excludes fixture data and shows no preview labels. A failed live
request never falls back to fixtures. The four mosaic tiles are permanent in every state.

A curated location with no published properties stays reachable at `/locations/[slug]`
but is `noindex` and omitted from the sitemap's inventory-backed set.

## Location detail

Every supported detail route uses its reusable locality scenery as the lead hero image,
with visible creator/source/license attribution. A typed slug-to-content structure owns
the factual title/caption, local path, alternative text, creator, source and license. The
short introduction leads with the place, current published inventory and available next
steps. It deliberately avoids popularity, neighborhood, travel, history and market claims
that are not supported by project data, and keeps only one concise public-location/privacy
disclosure. The inventory facts beside the hero remain derived from the current facet
count. Asset
provenance is recorded in
[`location-editorial-assets.md`](location-editorial-assets.md).

Location detail reuses the existing property query normalization, bounded nine-record
page size, strict first-value handling for repeated scalar filters, active filter chips,
sort options, pagination, invalid-page recovery, property cards, and the exact same lazy
Leaflet catalog-map engine used by `/properties`. The route location is the initial map
focus and fixed request filter; map markers and cards share active state, and selecting a
different area navigates to that area's canonical location route while retaining other
safe filters.
The route fixes its location from the validated path and never accepts a query value as
the location source of truth. Property links may carry a validated location-results URL
for Back to Results without changing the property's canonical URL.

## Privacy, SEO, and responsive behavior

Location pages consume public facet and property DTOs only. They never receive or render
`privateAddress`, internal coordinates, staff notes, or other private property data. Map
markers remain limited to independently approved `publicPoint` values and the established
public precision contract.

The location index and positive-count detail routes are canonical and included in the
bounded sitemap; curated locations with no published properties are `noindex`. Filtered detail states are `noindex, follow`; invalid locations have no
canonical. Detail JSON-LD is a breadcrumb containing public names and URLs only.

Wide screens use editorial image/text compositions and a map/list split. Tablet layouts
stack usable full-width surfaces. Mobile uses single-column cards, naturally sized maps,
touch-sized filters and controls, and no page-level horizontal scrolling. The shared
light visual system, focus indicators, reduced-motion behavior, header, and footer remain
the Part 1 implementation.
