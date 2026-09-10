# Brand and Public Experience

Status: approved branding and supplied website photography integrated; Part 1 of the
Figma-driven public rebuild implemented; production listing inventory remains external.
Last reviewed 2026-09-10.

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

Phone and messaging expectations vary by client, so the inquiry form accepts an optional
phone number but does not claim support for a messaging provider that has not been
selected.

## Information architecture

| Route                | Primary task                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| `/`                  | Understand the brand, begin a search and reach the next useful page         |
| `/properties`        | Filter, sort and page through published inventory                           |
| `/properties/[slug]` | Evaluate one published property and send an inquiry                         |
| `/about`             | Understand the positioning and service-area focus without fabricated claims |
| `/contact`           | Submit a general or property-related inquiry                                |
| `/sell`              | Start a seller conversation; no documents are collected publicly            |
| `/book-viewing`      | Request a viewing through the inquiry workflow; no time is promised         |

The last route records a request, not a confirmed appointment. Scheduling and booking
management remain Phase 2B work.

## Figma-driven homepage and shared shell

The homepage keeps server-rendered, API-backed featured listings and location facets. Its
hero search submits the existing allowlisted sales keyword state to `/properties`; it
does not introduce rental inventory or a second search contract. Empty and unavailable
states remain honest when the API or published inventory is absent.

The desktop header overlays the homepage hero and uses a compact version of the approved
logo, while other public routes retain a light sticky header. The mobile menu moves focus
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

- Mobile: one narrative column followed by the relevant action.
- Tablet: supporting content and action can sit side-by-side.
- Desktop: an asymmetric two-column composition keeps forms below a readable line length.

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
