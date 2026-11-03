# Brand and Public Experience

Status: approved branding and supplied website photography integrated; modern visual
foundation established; production listing inventory remains external. Last reviewed
2026-10-01.

This decision turns the supplied RC Premier Properties brief into durable rules for the
public website. It intentionally records no claims about company history, awards,
transactions, accreditations, office address or team members because none have been
supplied.

## Reference interpretation

### Homepage hero refinement (2026-10-03)

The full-viewport hero uses approved property photography, a white vector RC Premier
symbol above "Find a home worth coming home to.", supporting copy, and a Browse
properties link to `/properties`. A lower-right card links to Explore locations at
`/locations`; the desktop/tablet scroll cue is decorative. Menu and Book a viewing
sit at the upper right. The original full wordmark remains a secondary asset.

The hero has no search form. On phones, the supporting card appears only when the
viewport is tall enough; shorter screens omit it. The image crop, contrast overlay,
and safe-area spacing keep the content readable. Book a viewing remains an inquiry
request, not a confirmed appointment.

### Homepage full-screen menu (2026-10-03)

The menu fades over a clean Deep Charcoal full-screen surface. A white RC Premier
symbol, large editorial links for Properties, Locations, Sell, About, and Contact,
a Book a viewing action, social links, verified email, and current-year copyright
make up the content. There is no menu photograph, location caption, or grain layer.
The light sticky header uses the same symbol in Deep Charcoal.

Closing fades the content before the surface. Background content stays inert and body
scrolling remains locked through the exit transition. The menu restores the saved
page position on close, traps keyboard focus, supports Escape and focus restoration,
and removes nonessential motion for reduced-motion preferences. On short mobile
viewports, the menu surface can scroll so all actions remain reachable. Interior-page
navigation retains its own treatment.

### Homepage second section (2026-10-03)

Immediately after the hero, Warm Ivory carries the "A clearer way to find home"
eyebrow, a scroll-filled heading about helping Pampanga buyers and sellers, supporting
copy, and one approved residential photograph. This section has no Explore locations
CTA or image caption. Its content remains readable without JavaScript, and reduced
motion removes the scroll-driven fill.

The user-supplied `01-home-desktop-1440.png` informed the earlier public
foundation. The current homepage instead follows the approved hero, editorial
sections, and public shell described here. Its Compass branding, copy, inventory,
claims, and product features are not part of RC Premier.

The [Lagom Development homepage](https://lagom-development.com/) is a visual reference
for the earlier public foundation only. Useful established principlesâ€”restrained
navigation, asymmetric editorial media, generous whitespace, fine borders, and measured
transitionsâ€”remain where they complement the supplied Figma. Decorative section numbers
were removed from the rebuilt homepage. No source code, media, copy, or brand assets are
copied from either reference.

The [archived Presello snapshot](https://web.archive.org/web/20260105133339/https://www.presello.com/)
is the functional reference because the live site was unavailable during the audit. The
useful pattern is a prominent five-field search (property ID, location, property type,
minimum price and maximum price), followed by result feedback, listing cards and
pagination. RC Premier Properties uses that information hierarchy inside its own visual
system.

The supplied Part 2 references (`02-properties-desktop-1440.png` through
`05-location-detail-desktop-1440.png`) guide the denser split catalog, image-led property
detail, mosaic location index, and editorial location-detail compositions. RC Premier
data, controls, maps, public identifiers, and privacy rules replace all third-party
content visible in those flattened references. Mobile and tablet layouts are deliberate
reflows of that desktop direction rather than scaled screenshots.

## Public corners and scrolling (2026-10-03)

Public cards and framed imagery use `--radius-editorial`: `18px 0 18px 0`
on desktop, reduced to `12px 0 12px 0` at 768px and below. Top-left and
bottom-right corners are rounded; top-right and bottom-left stay sharp. The
shape applies to property/location cards, framed gallery and editorial media,
the hero supporting card and Section 2 photograph. Media
frames clip their images; the radius never animates. Buttons, forms, pills,
icon circles, staff UI, full-screen surfaces and full-bleed photography retain
their existing treatment. New public cards/media should reuse this token.

The public shell uses official `lenis` / `lenis/react` with automatic RAF,
conservative default wheel interpolation (`lerp: 0.1`), and native touch
scrolling (`syncTouch: false`). Staff routes under `/admin` have no Lenis
instance. Reduced-motion preferences, including changes during a visit,
disable smooth wheel scrolling and automatic RAF. There is no scroll-driven
React render loop, parallax, or additional animation dependency.

The native scrollbar remains visible. The menu stops Lenis for its full active
lifetime, preserves the existing native scroll lock, restores and synchronizes
the saved position immediately, then resumes scrolling. Inquiry dialogs and photo viewers share the same position-preserving lock;
overlapping overlays resume Lenis only after the last lock is released. Dialogs, menu content and interactive maps keep native nested
scrolling. Native anchors, keyboard/focus scrolling and normal route navigation
remain browser/Next.js behavior. The hero scroll indicator remains decorative.

## Brand system

RC Premier Properties is a modern architectural real-estate brand for Pampanga. It is
refined, premium, and confident without feeling like a generic luxury template or a SaaS
dashboard. Property photography carries the visual weight; the interface provides
structure, clarity, and an intuitive route to inquiry.

| Role           | Token / value                       | Use                                     |
| -------------- | ----------------------------------- | --------------------------------------- |
| Brand          | `--color-brand` / `#353D4A`         | primary structure and actions           |
| Deep brand     | `--color-brand-deep` / `#252C36`    | dark surfaces and closing sections      |
| Accent         | `--color-accent` / `#B49351`        | restrained emphasis and selected detail |
| Soft accent    | `--color-accent-soft` / `#D7C39D`   | detail on dark surfaces and hero serif  |
| Background     | `--color-background` / `#F8F6F1`    | warm ivory page canvas                  |
| Surface        | `--color-surface` / `#FFFFFF`       | clean white section cards               |
| Muted surface  | `--color-surface-muted` / `#EEEAE2` | soft stone section contrast             |
| Primary text   | `--color-text` / `#252A31`          | reading and primary UI text             |
| Secondary text | `--color-text-muted` / `#68707C`    | supporting copy and metadata            |
| Border         | `--color-border` / `#DDDCD7`        | subtle 1px separation                   |

Legacy `--brand-*`, `--surface-*`, and `--line` tokens remain semantic aliases during the
ongoing migration. Charcoal is the structural color; primary UI actions use charcoal or
deliberate gold accents. Gold is strictly an accent, never used indiscriminately for
every button, border, or heading.

### Typography

Manrope is the primary UI face for almost the entire application: hero, headings,
navigation, body copy, buttons, prices, property cards, search, filters, forms, and
metadata. It is loaded through `next/font/google` and exposed as `--font-sans`.

Instrument Serif is loaded through `next/font/google` as `--font-display` and used
sparingly as a secondary editorial accent. Only short emphasized phrases use Instrument
Serif Italic (e.g. "_see for yourself._" in the hero, "_feels like home._" in the
introductory narrative). The interface does not globally inherit or turn into a serif design.

Typographic scale:

- Desktop hero headline: `clamp(3rem, 6.2vw, 5.5rem)`, 700 weight, tight line-height `0.94–0.98`
- Mobile hero headline: `clamp(2.5rem, 8vw, 3.25rem)`
- Major section headings: 44–56px desktop, 32–40px mobile
- Page headings: 40–52px
- Property price: 24–30px, 700 weight
- Property title: 18–22px, 600 weight
- Body copy: 16–18px, line-height 1.6–1.7
- Navigation and buttons: 14–15px, 500/600 weight, sentence case
- Eyebrows: 12–13px, 700 weight, uppercase with `0.14em` letter-spacing

### Spacing and rhythm

The spacing rhythm uses a consistent scale: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 120, and
144px. Sections alternate deliberately across the page to create visual rhythm:

- Hero: Dominant twilight architectural photography with dark gradient readability overlay
- Introduction: Warm Ivory (`#F8F6F1`) with large copy and one residential photograph
- Featured Properties: Soft Stone (`#EEEAE2`, `--color-surface-muted`) with an editorial
  horizontal rail of Deep Charcoal (`#202630`) information-panel cards
- Why RC Premier: Warm Ivory (`#F8F6F1`) with the architectural house SVG and three statements
- Explore Pampanga: Warm Ivory (`#F8F6F1`) with the SVG location map and ledger
- Sell statement: Warm Ivory (`#F8F6F1`) with a direct seller CTA
- Video Tours: Warm Ivory (`#F8F6F1`) with horizontal tour carousel
- Route cards: Four photographic paths to property, viewing, details, and selling
- Public Footer: Soft Stone (`#EEEAE2`) with multi-column navigation and contact details

### Shape language, borders, and shadows

Geometry is restrained and architectural:

- Buttons and inputs: 6–8px radius
- Images and property cards: 8–12px radius
- Large panels: 12–16px maximum
- Subtle 1px borders (`#DDDCD7` on light surfaces, subtle rgba on dark surfaces)
- Heavy shadows are avoided; surface contrast, whitespace, fine borders, and photography
  carry depth.

Motion is functional and subtle (180–280ms) and respects `prefers-reduced-motion: reduce`.

## Media and logo rules

Approved RC Premier Properties design photography fills the public editorial
compositions. Listing records without assigned photos retain a restrained neutral
fallback; no design photo, random web photo, or agent identity is substituted as listing
media.

The public shell uses the vector RC Premier symbol and symbol-only SVG favicon.
Source PNGs and the full wordmark are retained for secondary contexts. Assignments and optimization rules
are documented in
[`../features/production-content-and-media.md`](../features/production-content-and-media.md).

## Audiences and their primary needs

- Buyers need fast filtering, transparent prices, useful specifications and a direct
  route to ask about a listing.
- Investors need comparable location, type, price and area information without invented
  returns or financial promises.
- Sellers need a clear route to start a confidential listing conversation without an
  unauthenticated document-upload workflow.
- Existing clients need a reliable contact route; account history is deferred until the
  authenticated-client phase.
- Staff need maintainable property and inquiry records. Public administration is not
  exposed until authentication and authorization are selected and implemented.

Phone and messaging expectations vary by client, so non-viewing inquiries accept an
optional phone number while viewing requests require one. The site does not claim support
for a messaging provider that has not been selected.

## Information architecture

| Route                   | Primary task                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `/`                     | Understand the brand, browse properties and reach the next useful page      |
| `/properties`           | Filter, sort and page through published inventory                           |
| `/properties/[slug]`    | Evaluate one published property and send an inquiry                         |
| `/locations`            | Explore an inventory-backed atlas of current Pampanga locations             |
| `/locations/[location]` | Explore one inventory-backed location and its published listings            |
| `/about`                | Understand the positioning and service-area focus without fabricated claims |
| `/contact`              | Submit a general or property-related inquiry                                |
| `/sell`                 | Start a seller conversation; no documents are collected publicly            |
| `/book-viewing`         | Request a preferred viewing date and time inline; staff must confirm it     |

The last route records a request, not a confirmed appointment. Scheduling and booking
management remain Phase 2B work.

## Figma-driven homepage and shared shell

The homepage keeps server-rendered, API-backed featured listings and location facets.
The hero links to property discovery instead of embedding a search form. Empty and
unavailable states remain honest when the API or published inventory is absent.

The Featured Properties section streams in its own `Suspense` boundary so the hero and
earlier sections never wait for the property API. It is a horizontally browsable rail whose
drag cursor, progress indicator, previous/next controls and keyboard scrolling appear only
when the rail genuinely overflows; the card count only chooses card sizing. Zero listings
show a lead-generation state, an unavailable API shows a calm contact state, and the two
are distinct internally. Reserved listings carry a restrained RESERVED chip. Development
fixtures (`?featuredFixture=…` under `next dev`) never reach production builds and are
never a fallback.

The homepage header begins over the hero and becomes a light sticky bar after the hero
leaves the viewport. The editorial routes `/properties`, `/locations`, `/about`, `/sell` and
`/book-viewing` render that same header in its sticky state from the first paint; detail,
contact and other interior routes retain the classic light header. The mobile menu moves focus
into the open panel, traps keyboard focus, closes on Escape, and returns focus to its
trigger. Current-route state is exposed with `aria-current` where a stable page route can
be determined.

Six RC Premier YouTube Shorts use a poster-first, horizontal scroll-snap row with
lazy thumbnails. A player is mounted only after a visitor selects a tour; the
selected embed requests autoplay and is removed when the tour is closed.

The shared footer now exposes the current public phone, `rcpremierph@gmail.com`, and
the supplied Facebook, Instagram, YouTube, and TikTok profiles. This scoped shell update
does not represent the later repository-wide contact-copy migration.

The app icon is a symbol-only vector SVG that adapts to browser light and dark
appearance. The original full-color/full-wordmark assets remain available for
secondary branding contexts.

## Level 18 public polish

The earlier Level 18 homepage search, location grid, video carousel, and dark footer
descriptions are superseded by the current homepage and public shell above. Public
navigation, cards, and footer links retain visible keyboard focus and reduced-motion
handling.

The About hero loads the approved Contentful video only on `/about`, begins at about four
seconds, stays muted/looping/inline, and retains the authorized About photograph as its
poster. Reduced-motion CSS hides the moving layer so the poster remains. The adjacent
regional photograph is replaced with a non-interactive SVG projection of the same local
22-feature boundary artifact used by the property map. The Sell page reuses approved RC
Premier photography in its hero and closing privacy composition without a separate
carousel or repeated promotional section.

## Level 21 targeted polish

The Sell experience is four purposeful sections: hero, seller form, concise process and
image-led privacy close. The seller form automatically submits `selling`, omits visible
inquiry-type and Property ID controls, and retains contact, property-area/details and
consent inputs. Public copy describes customer actions and staff follow-up without
exposing implementation terminology or making response, valuation, publication or
appointment promises.

The shared footer uses color and underline/border feedback without positional movement.
Email and phone remain compact but are separated as distinct, touch-usable rows. The
approved public email is `rcpremierph@gmail.com`, centralized in `public-contact.ts`.
No approved privacy policy exists, so the interface and documentation do not
fabricate one.

One shared header implementation owns hide/show behavior on every public route and resets
its complete frame to visible on navigation. Related public and admin button pairs share
height, alignment and width where the composition is intentionally symmetrical. Important
functional metadata, labels, facts and controls previously below the practical reading
floor now use approximately 11–12 CSS-pixel type; decorative eyebrows retain their role.

Narrow Home, About and Sell layouts bound horizontal gutters and control padding while
allowing text and buttons to wrap at 320 and 390 pixels with 200% text. Font sizes are not
reduced to manufacture a pass. The desktop Properties filter and map/results tracks use
zero-minimum sizing so the catalog also reflows under 200% text. Aggregate locality pins
retain their gold geometry with dark brand ink for the count, switching to white only for
the existing hover feedback.

## Final public geometry and hero behavior

The public shell uses a compact 64-pixel header and a proportional 96-pixel-wide logo.
The header stays visible at the top, after upward travel, whenever focus is inside it, and
while the mobile menu or a pointer interaction is active. Meaningful downward travel hides
it with a transform-only transition driven by one passive, animation-frame-bounded scroll
listener. Reduced-motion users receive the same state changes without a visible slide.

Desktop Home and About heroes intentionally occupy the dynamic viewport remaining below
the header, so the first composition ends at the viewport edge without a white strip. The
Home search stays centered in both the hero and its content column. At phone widths, the
Home photograph occupies a shallower wide frame above the search content, exposing more
of the authorized scene instead of enlarging a landscape source to fill a tall portrait
box.

Public cards, panels, search surfaces, form fields, map previews, and modal surfaces use
square or effectively square geometry. Circular shapes remain only where they communicate
an icon control, map marker, radio/checkbox state, or another established functional
meaning. The footer retains `#3a424f` while using tighter invitation, column, and closing
spacing.

The About video starts only after the browser motion preference is known. Its muted state
is applied before the single guarded `play()` request, metadata readiness gates the
one-time four-second seek, and rejected autoplay promises are handled without console
noise. Native looping is preserved without repeatedly seeking during normal playback;
reduced motion keeps the authorized poster in the same responsive hero composition.

## Responsive page blueprints

These blueprints are the design contract implemented by the pages. The application
itself is the clickable design; separate throw-away mockups are not maintained.

### Home

- Mobile: compact header, full-bleed hero, one clear sales-search entry, one-column
  editorial sections, and horizontally comfortable tap targets.
- Tablet: two-column content where hierarchy benefits, with media still dominant.
- Desktop: a bounded reference-led composition with compact cards, asymmetric media/text
  sections, and restrained section spacing.

### Properties

- Mobile: the five essential filters appear first; advanced filters use a native
  disclosure region; cards are one column; pagination remains finger-sized.
- Tablet: filters wrap into two or three columns and cards form a two-column grid.
- Desktop: the search surface spans the hero, filters align on a stable grid and listings
  use three columns where space permits.

### Property details

- Mobile: gallery placeholder, identity, price, specifications and inquiry CTA flow in
  reading order.
- Tablet: gallery and core facts gain a split layout while long content stays readable.
- Desktop: an editorial gallery grid and sticky inquiry panel support scanning without
  turning the page into a dashboard.

### About, contact, sell and viewing

- Mobile: editorial sections become one narrative column; forms retain full-width,
  touch-friendly controls and the tour dialog becomes a near-full-width scrollable sheet.
- Tablet: supporting content and action reflow deliberately without compressed fields.
- Desktop: the About, Contact and Sell references become bounded image-led editorial
  compositions. Contact and seller forms keep a readable asymmetric split. Request a Tour
  uses one two-step modal, with the selected property carried automatically from property
  detail pages.

The Part 3 references guide composition, spacing and hierarchy only. Every photograph is
an existing authorized RC Premier asset because the exact flattened-reference sources
were not available. About and Sell avoid third-party facts, metrics, founders, programs,
valuation promises and syndication claims. Contact uses the current email, phone and four
approved social profiles. `/book-viewing` is superseded by the inline scheduler described
in “Editorial public pages” below.

## Accessibility contract

Keyboard-visible focus, semantic landmarks, one page-level heading, persistent labels,
descriptive link names, live form feedback and at least 44-pixel primary touch targets
are required. Mobile navigation announces its expanded state and closes on Escape or
route change. Media placeholders are presentational unless their labels convey the
future asset purpose; future images require property-specific alternative text.

## External decisions still open

The production domain, production listing inventory/media, production map provider,
analytics, and monitoring providers remain unselected or unsupplied. The official logo,
favicon, website-design photography, email, phone, and Facebook Page were supplied for
Level 7. Remaining gaps must be shown honestly and never filled with invented values.

### Smart home header and responsive hero (2026-10-03)

The approved desktop hero and full-screen menu retain their composition. A single
homepage header and menu instance changes from absolute hero controls to a fixed editorial
toolbar only after the hero has completely left the viewport. IntersectionObserver owns
that boundary; the existing passive, animation-frame-bounded native scroll listener owns
direction. Lenis continues to drive the native scroll position. Downward travel of 48px
hides the toolbar; upward travel of 24px reveals it. React updates occur on state changes.

Warm Ivory, a subtle border, and the charcoal vector symbol distinguish the
sticky toolbar from the white hero symbol. Only toolbar elements slide, leaving
the menu anchored to the viewport. Hidden controls are inert; focus and an active
menu keep navigation available. Scroll lock retains the native scrollbar and
restores the saved position after the menu exit, including with reduced motion.

The toolbar is 72px on desktop, 68px on tablet, and 64px plus the top safe area on phones.
Below 640px, the hero and sticky header show Menu while Book a viewing remains available
inside the full-screen menu. Larger viewports show both controls in the header.

Phone and tablet heroes use 100svh with intentional image crops. Phone content stays
lower-left with the white symbol, three-line Manrope headline, supporting copy,
and Browse properties link. Tall phones retain the Explore locations card; short
phones omit it. The desktop/tablet scroll cue is hidden on phones.

### Mobile hero and menu follow-up (2026-10-03)

Below 640px, the hero and scrolled toolbar show Menu only; the mobile hero omits the
scroll capsule. Hero content shares a 24px left edge, with 24px logo/headline separation,
20px before supporting copy and 24px before Browse properties. The approved photo keeps
an intentional 58%/45% crop. Tall phones retain the secondary Explore locations card;
short phones omit it. Tablet and desktop keep their approved hero controls and scroll cue.

The mobile menu keeps its Book a viewing action, navigation, social links, verified
email, and copyright on the same charcoal surface. It has no property photograph,
location metadata, or grain. Keyboard trapping includes only visible controls;
background locking and Lenis stop/resume continue through the exit transition.

The hero observer is the source of sticky eligibility in both directions. Any hero
intersection disables the toolbar immediately and makes its controls inert. A 330ms
upward exit completes before the same header returns to its hero position; reduced
motion skips that delay. The sticky header uses the charcoal RC Premier symbol on
its light surface. These mobile rules supersede the earlier two-control hero and
scroll-cue descriptions.

### Mobile menu viewport fit (2026-10-03)

The mobile menu fills the viewport with a fixed charcoal surface and responsive
editorial navigation. Its content can scroll when a short viewport cannot show every
action at once; the page behind it remains locked. The white symbol, navigation,
Book a viewing action, social links, copyright, and email remain readable without
a photograph or grain layer. Reduced motion removes reveal transitions.

The RC Premier symbol mark is white on dark surfaces and Deep Charcoal (#252c36)
on light surfaces. The symbol-only SVG favicon adapts to the browser color scheme.
The full wordmark remains available where explicit brand naming is required.

### Editorial public pages (2026-11-03)

Locations, Sell, About and Book a Viewing share the Home/Properties language (Warm Ivory,
Deep Charcoal, soft stone, Manrope, thin rules, the asymmetric editorial corner) without
sharing one section template. All four use the sticky homepage header and a shared
`components/layout/editorial-page.module.css` frame whose top offset mirrors that header's
breakpoint heights.

- **Locations** is a property atlas: an ivory editorial opening with an inventory summary
  derived from the facets, a charcoal atlas pairing the generated Pampanga map with a
  numbered ledger, alternating location stories built from the documented locality
  scenery (with attribution), four location considerations, up to four current listings,
  an architectural interlude and the shared closing CTA. The ledger links are the only
  keyboard/assistive-tech path; map areas mirror the ledger selection and are a pointer
  shortcut with no focusable elements inside the map image. Counts are published-inventory
  `locationCounts`; a failed facet request shows an unavailable state, never sample areas.
- **Sell** leads with presentation and process before the form: hero, proposition, a
  five-stage journey, a real published listing shown as the presentation example (omitted
  when none is available), what to prepare with the sensitive-documents rule, the
  unchanged seller `InquiryForm`, and explicit not-a-valuation / not-a-listing-agreement
  disclosures.
- **About** keeps the motion-aware brand film and tells the brand story through a
  statement of focus, three alternating principle bands, the Pampanga boundary map (with a
  live location count only when the facets return one), a Discover → Understand → Visit →
  Converse sequence, a manifesto image, how RC Premier works, and four large navigation
  rows. It makes no claims about history, team size, awards or transaction volume.
- **Book a Viewing** is an inline scheduler (see `docs/features/inquiries.md`). It never
  presents dates or times as availability.
