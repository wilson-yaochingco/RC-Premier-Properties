# Media Operations and Replacement

Status: approved website media integrated; listing uploads available in development.
Last reviewed 2026-09-08.

Run media work from the repository root. Website design assets belong under
`frontend/src/assets/` and must be imported through `next/image`. Listing images belong
to an individual property and must be uploaded through Admin → Properties → Edit →
Property media. Never place a real listing gallery in the website-design asset folder.

The supplied official logo/favicon and all ten site photographs are integrated. Source
PNGs are retained and Next.js negotiates responsive WebP/AVIF delivery. Do not manually
convert, stretch, outpaint, or replace them with stock, competitor, or generated media.
See [Production Content, Branding, and Media](../features/production-content-and-media.md)
for assignments and approved business details.

## Development listing uploads

Start both applications, sign in with an authorized staff identity, open an editable
property, and use **Upload Photos**. PNG, JPEG, and WebP are accepted up to 12 MB each.
Alternative text is required. Each successful upload persists immediately; reorder,
cover, caption, focal-point, and removal changes use **Save property media**.

The development adapter writes generated delivery files to
`frontend/public/media/properties/` and retained sources to
`frontend/.local-media-sources/`. Both are ignored and machine-local. They are not seed
data and must not be committed. Removing a generated image from gallery metadata cleans
up both local forms after MongoDB confirms the change.

Production mode does not use this adapter. It returns 503 until an approved object
storage/CDN adapter is configured. Do not work around the gate by copying production
listing images into `public/` or adding broad remote-image host patterns.

## Acceptance

- Confirm the logo and favicon remain legible at browser/header/footer sizes.
- Confirm the portrait hero and galleries do not stretch or destructively crop.
- Confirm only the true hero LCP image is prioritized.
- Confirm missing listing media uses a neutral fallback.
- Confirm upload authorization, exact origin, CSRF, MIME/signature, size, and optimistic
  version failures are rejected.
- Confirm production builds contain no development-sample listing output.
- Record live object-storage/CDN acceptance only after a provider is selected.
