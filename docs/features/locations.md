# Public Locations

The `/locations` index presents Angeles City, Mabalacat City, Magalang and Porac as
static editorial cards. Cards have no links, focus targets or hover actions. Their
approved property photographs illustrate residential spaces; they do not claim to show
the named locality. All four use responsive Next Image delivery and lazy loading below
the full-height video hero, with fixed grid frames and a dark text scrim.

The existing cinematic hero, reversible community statement, shared featured-property
section, development previews, guidance and closing CTA remain. The index retains
`force-dynamic` for its search-parameter-driven development scenarios; the mosaic is a
static server component without fetching or client hydration of its own.

Location detail pages have been removed. Old detail URLs return the global 404 without
redirects. Home map, featured-location navigation and footer location links use the shared
`publicLocationCatalogPath` helper to open `/properties?location=<short name>`. Filtering,
sorting and pagination belong to the existing property catalog.

The index remains canonical at `/locations`. A catalog filtered only by a single
positive-count location has its own normalized canonical and sitemap/llms.txt entry.
Unsupported, empty or combined-filter states retain the catalog's existing noindex policy.
See [SEO policy](seo-and-social-discovery.md) and
[editorial asset provenance](location-editorial-assets.md).
