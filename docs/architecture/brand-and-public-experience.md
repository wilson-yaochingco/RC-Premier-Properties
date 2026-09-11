# Brand and Public Experience

Status: approved branding and supplied website photography integrated; Level 18 public
experience polish implemented; production listing inventory remains external. Last
reviewed 2026-09-11.

This decision turns the supplied RC Premier Properties brief into durable rules for the
public website. It intentionally records no claims about company history, awards,
transactions, accreditations, office address or team members because none have been
supplied.

## Reference interpretation

The user-supplied `01-home-desktop-1440.png` is the primary visual reference for the
current homepage and shared public shell. It contributes the full-bleed search-led hero,
compact listing grid, narrow callout, paired editorial composition, concise location
discovery, restrained dark footer, and lighter overall density. Its Compass branding,
copy, inventory, claims, and product features are not part of the implementation.

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

## Brand system

| Role              | Token / value                         | Use                                                          |
| ----------------- | ------------------------------------- | ------------------------------------------------------------ |
| Structure         | `--brand-primary` / `#3a424f`         | headings, navigation, dark panels and high-contrast controls |
| Deep structure    | `--brand-primary-deep` / `#2f3641`    | depth on dark compositions                                   |
| Accent            | `--brand-secondary` / `#b4893d`       | rules, selected states, fills and premium detail             |
| Accent text       | `--brand-secondary-text` / `#806024`  | small gold-toned text on light surfaces                      |
| Light accent      | `--brand-secondary-light` / `#d9bd83` | gold-toned text on dark surfaces                             |
| Ink on accent     | `--brand-ink-on-gold` / `#202630`     | normal-size text on `#b4893d` surfaces                       |
| Canvas            | `--brand-white` / `#ffffff`           | the dominant page background                                 |
| Soft surface      | `--surface-soft` / `#f4f2ed`          | low-contrast section separation                              |
| Warm surface      | `--surface-warm` / `#e9e3d8`          | warmer editorial section contrast                            |
| Legacy media tone | `--surface-violet` / `#665d70`        | intentional dark compositions, not missing-image fallback    |

The accent is not used for normal-size white text because that pairing does not provide
enough contrast. The derived `--brand-secondary-text` token darkens gold-toned text to
`#806024` on light surfaces, while `--brand-ink-on-gold` uses `#202630` for normal text
on the `#b4893d` accent surface.

Typography uses deliberate system stacks so production builds never depend on a remote
font download. Display headings use an editorial serif stack; navigation, body copy and
controls use a clean humanist sans-serif stack. Type is fluid with `clamp()` and must not
depend on a single desktop breakpoint.

The spacing rhythm is based on 4, 8, 12, 16, 24, 32, 48, 64, 96 and 144 pixels. Cards use
small or no corner radii, fine borders and restrained shadows. Icons are simple line
symbols with visible text labels where meaning would otherwise be ambiguous.

Motion is functional: 160–240 ms for control feedback, up to 480 ms for large menu or
section transitions. Transform and opacity are preferred. All non-essential motion is
removed under `prefers-reduced-motion: reduce`.

## Media and logo rules

Approved RC Premier Properties design photography fills the public editorial
compositions. Listing records without assigned photos retain a restrained neutral
fallback; no design photo, random web photo, or agent identity is substituted as listing
media.

The public shell uses the supplied official logo and favicon. Source PNGs are retained;
display copies only trim transparent outer margins. Assignments and optimization rules
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
| `/`                     | Understand the brand, begin a search and reach the next useful page         |
| `/properties`           | Filter, sort and page through published inventory                           |
| `/properties/[slug]`    | Evaluate one published property and send an inquiry                         |
| `/locations`            | Browse bounded, inventory-backed public locations                           |
| `/locations/[location]` | Explore one inventory-backed location and its published listings            |
| `/about`                | Understand the positioning and service-area focus without fabricated claims |
| `/contact`              | Submit a general or property-related inquiry                                |
| `/sell`                 | Start a seller conversation; no documents are collected publicly            |
| `/book-viewing`         | Request a viewing through the inquiry workflow; no time is promised         |

The last route records a request, not a confirmed appointment. Scheduling and booking
management remain Phase 2B work.

## Figma-driven homepage and shared shell

The homepage keeps server-rendered, API-backed featured listings and location facets. Its
hero search submits the existing allowlisted sales keyword state to `/properties`; it
does not introduce rental inventory or a second search contract. Empty and unavailable
states remain honest when the API or published inventory is absent.

The public header and approved logo now use the same dimensions, spacing and light
surface on the homepage and interior routes. The mobile menu moves focus
into the open panel, traps keyboard focus, closes on Escape, and returns focus to its
trigger. Current-route state is exposed with `aria-current` where a stable page route can
be determined.

The three approved YouTube Shorts use a native horizontal scroll-snap carousel. Only the
current slide is exposed to assistive technology and keyboard focus, only the explicitly
selected player is mounted, changing slides unmounts the player, and player URLs do not
request autoplay. No YouTube or thumbnail request occurs during the initial page load.

The shared footer now exposes the current public phone, `rcpropertiesss@gmail.com`, and
the supplied Facebook, Instagram, YouTube, and TikTok profiles. This scoped shell update
does not represent the later repository-wide contact-copy migration.

The app icon remains the approved mark. Its display derivative is a square 512-pixel PNG
with only a small transparent safe area; the oversized vertical canvas was removed
without redrawing or recoloring the artwork.

## Level 18 public polish

The primary client dark is `#3a424f`; gold is normally a border or detail on public
buttons rather than a large fill. Public buttons use a light surface, gold border, dark
text and a dark hover/focus response. Page canvases remain light. Interactive navigation,
text links, cards and footer links have restrained hover feedback plus stronger
`:focus-visible` treatment, with non-essential transitions removed for reduced motion.

The homepage uses the supplied residence photograph with a controlled brand-color
gradient so search text stays readable. Its search is the existing keyword/Property-ID
workflow in a larger tabbed, reference-led visual frame. Location discovery is now a
three-column image-led grid populated only from public facet counts and the documented
locality photography. Featured Property Videos remain a three-item, click-to-load,
single-player scroll-snap carousel on a white section. The footer uses the primary dark
and ends with the dynamic-year copyright line; no office or locality claim is appended.

The About hero loads the approved Contentful video only on `/about`, begins at about four
seconds, stays muted/looping/inline, and retains the authorized About photograph as its
poster. Reduced-motion CSS hides the moving layer so the poster remains. The adjacent
regional photograph is replaced with a non-interactive SVG projection of the same local
22-feature boundary artifact used by the property map. The Sell page uses three existing
authorized RC Premier photographs in a dependency-free stack with named controls,
left/right keyboard support, swipe gestures, no autoplay and reduced-motion styling.

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
approved social profiles. The legacy `/book-viewing` route remains indexable and compatible
but no longer maintains a second booking-page presentation.

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
