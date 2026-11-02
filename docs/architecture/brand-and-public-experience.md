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

The supplied Somerstone screenshot now governs the homepage hero composition only:
full-viewport property photography, compact Menu and Book a viewing controls at the top
right, the approved RC Premier logo above a lower-left Manrope headline, an editorial
text link, a subtle lower-right property card, and a bottom-center scroll cue. Its brand,
copy, and media are not copied. The hero uses a transparent monochrome white derivative
of the official logo. The original charcoal/gold
asset remains the treatment for light backgrounds.

The home header reuses the existing navigation focus, Escape, and scroll-lock behavior
in a full-screen charcoal menu. Book a viewing links to `/book-viewing`, which remains a
request rather than a confirmed appointment. Browse properties links to `/properties`;
the search panel is removed from the hero. Mobile uses a safe full viewport, a larger
image request for the tall crop, and hides the supporting card. A plain dark overlay
provides contrast. All sections below the hero retain their existing implementation.

The hero-specific direction takes precedence over earlier hero descriptions below.

### Homepage full-screen menu (2026-10-03)

The homepage menu crossfades the hero into Deep Charcoal, with a fine static SVG grain
layer, staggered Manrope navigation at the left and one approved property photograph at
the right. Uppercase navigation uses a balanced 48–60px desktop scale with short muted
dash markers to the left of each item. The larger editorial image is capped at 520px with the shared editorial corners; approved social
icons use 36px circles with 44px hit areas below the photograph. A right-aligned
ANGELES CITY, PAMPANGA / RESIDENTIAL label balances them, using the location supplied
by the user for this menu image. Static monochrome SVG grain uses a screen blend
and 12% opacity for visible light speckles over Deep Charcoal.
It never slides from an edge. The transparent white logo sits at the upper
left; Close and Book a viewing remain at the upper right. The viewing link preserves the
hero's arrow rotation and label feedback. Bottom details use the verified public email
and a current-year copyright. Mobile retains the navigation and socials and hides the
editorial image.

Closing fades the content before the surface. Background content stays inert and body
scrolling remains locked through the exit transition. The homepage freezes the body at
its saved position while retaining the native root scrollbar track, then restores the
position on close without a smooth-scroll animation. The existing menu owns keyboard
focus trapping, Escape and focus restoration. Reduced motion removes stagger, spatial
movement and reveal transitions. Interior-page navigation retains its existing treatment.

### Homepage second section (2026-10-03)

Immediately after the full-viewport hero, Warm Ivory introduces “Not every house feels
like the right one.” Large Manrope typography leads the left column; concise guidance
and Explore locations (`/locations`) sit at the right. One oversized cinematic crop of
the approved `home-hero-1.png` anchors the section. Its caption describes residential
architecture without asserting an unverified location or presenting editorial media as
listing inventory. Mobile stacks the text and uses a taller crop.

Section 2 is the primary locations prompt. The hero retains Browse properties and its
inventory-context supporting link to `/properties`, plus Book a viewing to
`/book-viewing`; no new routes or fetching behavior are introduced. A one-time viewport
reveal sequences text and the image mask. Content remains visible without JavaScript,
keyboard focus reveals the content, and reduced motion removes all spatial reveals.
The hero scroll marker travels through the full padded interior: 21px desktop, 13px
mobile, with 6px clearance from the inside of each border and no opacity animation.

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

## Public corners and scrolling (2026-10-03)

Public cards and framed imagery use `--radius-editorial`: `18px 0 18px 0`
on desktop, reduced to `12px 0 12px 0` at 768px and below. Top-left and
bottom-right corners are rounded; top-right and bottom-left stay sharp. The
shape applies to property/location cards, framed gallery and editorial media,
the hero supporting card, menu photograph, and Section 2 photograph. Media
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
- Introduction: Warm Ivory (`#F8F6F1`) with asymmetric image collage
- Featured Properties: Pure White (`#FFFFFF`) with 3-column cards
- Value Pillars: Deep Charcoal (`#252C36`) with architectural dining media
- Location Index: Soft Stone (`#EEEAE2`) with 4-column scenic photographic rail
- Seller Callout: Pure White (`#FFFFFF`) with modern exterior split panel
- Video Tours: Warm Ivory (`#F8F6F1`) with horizontal tour carousel
- Closing CTA: Deep Charcoal (`#252C36`) with two-column decision split
- Public Footer: Rich dark surface (`#191F27`) with multi-column structure

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

The shared footer now exposes the current public phone, `rcpremierph@gmail.com`, and
the supplied Facebook, Instagram, YouTube, and TikTok profiles. This scoped shell update
does not represent the later repository-wide contact-copy migration.

The app icon remains the approved mark. Its display derivative is a square 512-pixel PNG
with only a small transparent safe area; the oversized vertical canvas was removed
without redrawing or recoloring the artwork.

## Level 18 public polish

The current visual foundation supersedes earlier color, typography, button, and radius
details in this historical section. Existing page compositions remain in place until
their separate redesign work begins. Interactive navigation, text links, cards and footer
links retain restrained hover feedback plus stronger `:focus-visible` treatment, with
non-essential transitions removed for reduced motion.

The existing homepage photography treatment remains in place pending its separate
redesign. Its search is the existing keyword/Property-ID workflow in a larger tabbed,
reference-led visual frame. Location discovery is now a three-column image-led grid
populated only from public facet counts and the documented locality photography. Featured
Property Videos remain a three-item, click-to-load, single-player scroll-snap carousel on
a white section. The footer uses the primary dark and ends with the dynamic-year copyright
line; no office or locality claim is appended.

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

### Smart home header and responsive hero (2026-10-03)

The approved desktop hero and full-screen menu retain their composition. A single
homepage header and menu instance changes from absolute hero controls to a fixed editorial
toolbar only after the hero has completely left the viewport. IntersectionObserver owns
that boundary; the existing passive, animation-frame-bounded native scroll listener owns
direction. Lenis continues to drive the native scroll position. Downward travel of 48px
hides the toolbar; upward travel of 24px reveals it. React updates occur on state changes.
Warm Ivory, the subtle border, and the original transparent charcoal/gold logo distinguish
the toolbar from the white hero logo. Only toolbar elements slide, leaving the fixed menu
anchored to the viewport. Hidden controls are inert; focus and active menu interactions
keep navigation available. The existing scroll lock retains the native scrollbar and
restores the saved position after the menu exit, including with reduced motion.

The toolbar is 72px on desktop, 68px on tablet, and 64px plus the top safe area on phones.
Below 640px it shows the logo and Menu; Book a viewing remains prominent in the same
full-screen menu. The hero keeps both top-right controls from 360px upward. Below that,
the viewing action is available in the menu. Its light-surface CTA inverts to charcoal;
arrow rotation and the subtle label scale are preserved.

Phone and tablet heroes use 100svh. Intentional photo positions are 60%/45% on phones,
56%/45% on small tablets, 58%/45% on larger tablets, and the approved center/45% on desktop.
Phone content stays lower-left with a 112px white logo, a fluid 38�48px three-line Manrope
heading, bounded 15px copy, and the primary Browse properties link to /properties.
Tablets use a 50�64px headline and independent content/card sizing. Below 640px the
compact landscape support card appears only at viewport heights of at least 780px; shorter
screens omit it. Its contextual action is Explore locations (/locations). Safe-area-aware
bottom spacing reserves a separate, centered lane for the existing animated scroll cue.
Interior-page layouts, Section 2 and subsequent sections remain outside this refinement.

### Mobile hero and menu follow-up (2026-10-03)

Below 640px, the hero and scrolled toolbar show Menu only; the mobile hero omits the
scroll capsule. Hero content shares a 24px left edge, with 24px logo/headline separation,
20px before supporting copy and 24px before Browse properties. The approved photo keeps
an intentional 58%/45% crop. Tall phones retain the secondary Explore locations card;
short phones omit it. Tablet and desktop keep their approved hero controls and scroll cue.

The same cinematic menu places the mobile viewing CTA directly below primary navigation,
then restores the existing approved property photograph in a wide editorial frame. The
verified social links and supplied Angeles City / Residential metadata sit beneath it;
metadata stacks below socials on narrow phones. Copyright and verified email remain at
the bottom of the internally scrollable panel. The existing static grain is unchanged.
CSS selects the viewing CTA placement, and keyboard trapping includes only visible controls.
Background locking and Lenis stop/resume continue through the exit transition.

The hero observer is the source of sticky eligibility in both directions. Any hero
intersection disables the toolbar immediately and makes its controls inert. A 330ms
upward exit completes before the same header returns to its absolute hero position;
reduced motion skips that delay. The normal transparent charcoal/gold logo sits centered
in a bounded contain-fit image frame: 112px desktop, 104px tablet and 94px phone, with
52/48/46px maximum display heights to avoid crowding the compact toolbar. These mobile
rules supersede the previous two-control hero and scroll-cue descriptions above.

### Mobile menu viewport fit (2026-10-03)

The mobile menu now fits one viewport at 320�568, 360�740, 375�667, 375�812,
390�844 and 430�932. The previous non-shrinking content, generous block padding/margins,
and 16:10 image exceeded the viewport; scrolling the whole overlay also moved its absolute
grain layer away from the visible bottom. The fixed mobile surface now explicitly fills
100dvh (with 100svh fallback), has no padding or scrolling, and owns the unchanged grain.
An inner grid places the logo first, a vertically balanced navigation/CTA/image group in
the flexible middle row, and copyright/email in the bottom row with 16�20px plus safe-area
clearance. Desktop uses display:contents on this wrapper to preserve its composition.

Mobile navigation uses 32�42px Manrope at 1.08 line height and compact 44px-or-taller rows.
The image uses a viewport-height clamp, reducing further below 700px and 600px heights;
socials are 30px circles with expanded touch areas. Only viewports at or below 480px high
allow the inner content layer to scroll. The fixed background/grain never scrolls, and the
emergency footer ends at the same bottom padding. Existing Lenis locking, exact scroll
restoration, focus trapping, and hero/sticky-header behavior are preserved. This replaces
the previous default internally scrolling mobile menu treatment.
