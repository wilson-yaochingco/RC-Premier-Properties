# Brand and Public Experience

Status: implemented design direction for the public MVP. Last reviewed 2026-09-01.

This decision turns the supplied RC Premier Properties brief into durable rules for the
public website. It intentionally records no claims about company history, awards,
transactions, accreditations, office address or team members because none have been
supplied.

## Reference interpretation

The [Lagom Development homepage](https://lagom-development.com/) is a visual reference
for the home page only. The implementation borrows its editorial pacing: a tall media-led
hero, restrained navigation, numbered section markers, asymmetric grids, generous white
space, fine borders, large display type and measured transitions. No source code, media,
copy or brand assets are copied.

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
| Media placeholder | `--surface-violet` / `#665d70`        | explicit, replaceable media slots                            |

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

No photographs or video files ship with the MVP. Every required slot uses the shared
`MediaPlaceholder` presentation and a precise label such as `[HOME HERO VIDEO]` or
`[PROPERTY GALLERY IMAGE]`. Its aspect ratio and container behavior are the replacement
contract for future media.

The requested RC Premier Properties logo asset is not present in the repository or the
supplied attachment. The header therefore renders the company name as text in a clearly
isolated brand slot; it is not a newly designed logo. Replace that slot when the approved
asset is supplied. The complete placeholder inventory and replacement constraints live
in [`development/media-replacement.md`](../development/media-replacement.md).

## Audiences and their primary needs

- Buyers need fast filtering, transparent prices, useful specifications and a direct
  route to ask about a listing.
- Renters need the same discovery path with sale/rent intent clearly separated.
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

## Responsive page blueprints

These blueprints are the design contract implemented by the pages. The application
itself is the clickable design; separate throw-away mockups are not maintained.

### Home

- Mobile: compact header, full-height hero, stacked search fields, one-column editorial
  sections and horizontally comfortable tap targets.
- Tablet: two-column content where hierarchy benefits, with media still dominant.
- Desktop: wide editorial grid, asymmetric media/text compositions and numbered section
  rails inspired by the reference pacing.

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

The production domain, real logo/media, company contact details, map provider, analytics
and monitoring providers remain unselected or unsupplied. Their absence must be shown
honestly and never filled with invented values.
