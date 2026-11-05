import Link from "next/link";
import locationImage from "@/assets/site/location.png";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { RollLabel } from "@/components/ui/RollLabel";
import { DevHomepagePreview } from "@/features/home/DevHomepagePreview";
import { FeaturedLocations } from "@/features/locations/FeaturedLocations";
import { LocationSearch } from "@/features/locations/LocationSearch";
import { LocationShowcase } from "@/features/locations/LocationShowcase";
import { buildSearchOptions } from "@/features/locations/location-search";
import { buildLocationsMetadata } from "@/features/locations/location-seo";
import {
  loadLocationsInventory,
  parseLocationsFixtureScenario,
} from "@/features/locations/locations-inventory";
import styles from "@/features/locations/locations-index.module.css";

export const dynamic = "force-dynamic";
export const metadata = buildLocationsMetadata(locationImage.src);

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default async function LocationsPage({ searchParams }: PageProps<"/locations">) {
  const query = await searchParams;
  // `locationsFixture` is a development-only preview; production ignores it.
  const inventory = await loadLocationsInventory(
    parseLocationsFixtureScenario(query.locationsFixture),
  );
  // Search options come from the public facets when they loaded, else the curated and
  // residential defaults; every option maps to a real catalog filter.
  const searchOptions = buildSearchOptions(
    inventory.status === "ready" ? inventory.filters : {},
  );

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      {/* 1. Centred architectural opening */}
      <section className={styles.hero} aria-labelledby="locations-title">
        <div className={styles.heroArt} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Location guide · Pampanga</p>
          <h1 id="locations-title" className={styles.heroTitle}>
            Find the right place for your next home.
          </h1>
          <p className={styles.heroLede}>
            Explore Pampanga by area and discover homes in communities that suit your
            priorities and lifestyle.
          </p>
          <a href="#featured-locations" className={`${styles.heroAction} cta`}>
            <RollLabel>Explore locations</RollLabel>
            <Arrow />
          </a>
        </div>
      </section>

      {/* 2. Featured locations: the mosaic stands on its own */}
      <section
        id="featured-locations"
        className={styles.featured}
        aria-labelledby="featured-title"
      >
        <h2 id="featured-title" className={styles.srOnly}>
          Featured locations
        </h2>
        <div className={styles.featuredInner}>
          <FeaturedLocations inventory={inventory} />
        </div>
      </section>

      {/* 3. Refine the search */}
      <section className={styles.refine} aria-labelledby="refine-title">
        <div className={styles.refineInner}>
          <div className={styles.refineHead}>
            <div className={styles.refineTitleGroup}>
              <p className={styles.eyebrow}>Discover by what matters</p>
              <h2 id="refine-title" className={styles.refineTitle}>
                Refine the search around your priorities.
              </h2>
            </div>
            <p className={styles.refineLede}>
              Explore available properties across Pampanga using the location, property
              type, and budget that work for you.
            </p>
          </div>
          <LocationSearch options={searchOptions} />
        </div>
      </section>

      {/* 4. Current collection */}
      <section className={styles.collection} aria-labelledby="collection-title">
        <div className={styles.collectionInner}>
          <div className={styles.collectionHead}>
            <div className={styles.collectionCopy}>
              <p className={styles.eyebrow}>Current collection</p>
              <h2 id="collection-title" className={styles.sectionTitle}>
                Homes worth exploring.
              </h2>
              <p className={styles.collectionLede}>
                Discover currently published properties across Pampanga.
              </p>
            </div>
            <Link href="/properties" className={`${styles.quietAction} cta`}>
              <RollLabel>Browse all properties</RollLabel>
              <Arrow />
            </Link>
          </div>
          <LocationShowcase collection={inventory.collection} />
        </div>
      </section>

      {/* 5. Closing */}
      <EditorialCta
        id="locations-cta-heading"
        eyebrow="Not sure where to begin?"
        headline={["Tell us what", "matters most."]}
        body="RC Premier can help narrow the search around preferred locations and property needs."
        label="Talk to RC Premier"
        href="/contact"
      />
      <DevHomepagePreview />
    </main>
  );
}
