# Sell page

The public `/sell` page uses the established cinematic editorial frame: a temporary
reference to `/media/homepage-hero.mp4`, preparation guidance and an existing approved
interior photograph, a four-step selling journey, the seller inquiry form, and the
shared EditorialCta/footer. The film reference is
localized in `features/sell/SellHero.tsx`; no duplicate asset is required.

The page reuses HomeHeroVideo, HomeHeroCover, PageMotion and the existing Lenis bridge.
Hero lines have static responsive markup; their entrance changes only transforms.
Section entrances retain readable defaults and honor reduced motion. The preparation
checklist column stretches to the photograph's height and ends in a link to the inquiry
form; the inquiry section is a centred heading above a single-column form (two-up
rows for email/phone and location/type).

The existing `InquiryForm` seller variant and API contract are unchanged. Location and
optional property type form the subject; the owner's property details remain the message.
A preferred asking price may be included in that message, and is not required. No
uploads, valuation, publication or listing agreement are implied by submission. Native
validation, explicit consent, pending feedback, recoverable errors and the received
inquiry reference remain part of the actual inquiry flow. See [inquiries](inquiries.md).

The hero and closing CTA link to `#sell-inquiry`. The SiteHeader treats Sell as a
cinematic route and reuses the About film-header logo treatment without changing other
routes. The sequence is hero, preparation, journey, inquiry and CTA; there is no FAQ.
