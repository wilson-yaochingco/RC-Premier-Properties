# Legal pages

Status: `/privacy`, `/terms` and `/disclaimer` are published without a draft banner, but
the copy is not legal advice and has not been reviewed by counsel; the items below remain
open for the business. Update `LEGAL_UPDATED` with any copy change.

## Implementation

- Shared layout: `features/legal/LegalPage.tsx` and `legal.module.css` (hero, sticky
  table of contents, numbered sections). Each page only supplies its sections.
- Pages use the shared redesigned header (see `SiteHeader`) and are linked from the
  footer's bottom row.
- The Contact, Sell, Request a Tour and Book a Viewing consent lines link to `/privacy`
  (new tab). The existing required consent checkbox is unchanged.
- Not created, deliberately: Cookie Policy, cookie banner, accessibility statement,
  refund or shipping pages.

## Facts the copy relies on (from the codebase)

- Forms collect name, email, phone, inquiry type, optional subject/message, property
  reference, requested viewing date/time, and a consent flag with timestamp. Seller
  inquiries add location/property type; no identity or title documents are accepted.
- Submissions are stored in MongoDB, readable only by authenticated staff, with no public
  read route. Email notification to staff exists but delivery is disabled until a
  provider is approved.
- No hard-delete route; archive is recoverable; no retention period or purge exists yet.
- No analytics, advertising scripts or non-essential cookies were found. `sessionStorage`
  holds only the home intro flag and scroll position. YouTube uses the
  `youtube-nocookie.com` player after a click; map tiles load from a configurable tile
  provider (OpenStreetMap by default outside public deployments).
- Public contact: `rcpropertiesss@gmail.com`, `+63 918 429 1873`; no approved office address.
- Development-sample photos are labelled "Development sample — not this listing" and that
  label is untouched.

## Open items to confirm and review

1. Legal entity name, registration details and business address.
2. Who acts as the data protection officer / privacy contact, and whether
   `rcpropertiesss@gmail.com` is the right address for privacy requests. The NPC
   registration status, if any, is not stated.
3. A retention period and deletion procedure for inquiry records.
4. The actual hosting, database and email providers (the copy names none), and where
   data is stored.
5. Whether staff email notifications are in use, and the production map tile provider.
6. Any PRC broker licence, DHSUD or developer status to be disclosed (RA 9646). The
   copy deliberately makes no such claim.
7. Whether disputes should name a specific venue, and any marketing use of contact data.
8. Counsel review of all three pages.
