import type { PublicPropertySummary } from "@rc/shared";
import Link from "next/link";
import locationImage from "@/assets/site/location.png";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { RollLabel } from "@/components/ui/RollLabel";
import { DevHomepagePreview } from "@/features/home/DevHomepagePreview";
import { FeaturedLocations } from "@/features/locations/FeaturedLocations";
import { LocationExplorer } from "@/features/locations/LocationExplorer";
import { LocationHomes, type HomesLocation } from "@/features/locations/LocationHomes";
import { LocationHouse } from "@/features/locations/LocationHouse";
import {
  FEATURED_LOCATIONS,
  inventoryLabel,
  type LocationsInventory,
} from "@/features/locations/featured-locations";
import {
  loadLocationsInventory,
  parseLocationsFixtureScenario,
} from "@/features/locations/locations-inventory";
import { buildLocationsMetadata } from "@/features/locations/location-seo";
import styles from "@/features/locations/locations-index.module.css";
import { PropertyCatalogCard } from "@/features/properties/PropertyCatalogCard";

export const dynamic = "force-dynamic";
export const metadata = buildLocationsMetadata(locationImage.src);

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Area-level state for the explorer: a confirmed count, a confirmed zero, or unknown. */
function areaState(inventory: LocationsInventory, slug: string) {
  if (inventory.status !== "ready") return "unavailable" as const;
  return (inventory.counts[slug] ?? 0) > 0 ? ("homes" as const) : ("empty" as const);
}

/** Panel state for homes: also unavailable when that area's own request failed. */
function homesState(inventory: LocationsInventory, slug: string) {
  if (inventory.status !== "ready") return "unavailable" as const;
  const homes = inventory.homes[slug];
  if (homes === "unavailable") return "unavailable" as const;
  if ((inventory.counts[slug] ?? 0) < 1) return "empty" as const;
  return homes && homes.length > 0 ? ("homes" as const) : ("unavailable" as const);
}

export default async function LocationsPage({ searchParams }: PageProps<"/locations">) {
  const query = await searchParams;
  // `locationsFixture` is a development-only preview; production ignores it.
  const inventory = await loadLocationsInventory(
    parseLocationsFixtureScenario(query.locationsFixture),
  );

  const explorerLocations = FEATURED_LOCATIONS.map((location) => ({
    slug: location.slug,
    name: location.name,
    href: location.href,
    description: location.description,
    inventory: inventoryLabel(inventory, location.slug),
    state: areaState(inventory, location.slug),
  }));

  const homesLocations: HomesLocation[] = FEATURED_LOCATIONS.map((location) => {
    const state = homesState(inventory, location.slug);
    const homes: readonly PublicPropertySummary[] =
      inventory.status === "ready" && Array.isArray(inventory.homes[location.slug])
        ? (inventory.homes[location.slug] as readonly PublicPropertySummary[])
        : [];
    return {
      slug: location.slug,
      name: location.name,
      href: location.href,
      inventory: inventoryLabel(inventory, location.slug),
      state,
      ...(inventory.status === "ready"
        ? { count: inventory.counts[location.slug] ?? 0 }
        : {}),
      cards:
        state === "homes"
          ? homes.map((property) => (
              <PropertyCatalogCard
                key={property.id}
                property={property}
                resultsHref={location.href}
              />
            ))
          : undefined,
    };
  });

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      {/* 1. Centred architectural opening */}
      <section className={styles.hero} aria-labelledby="locations-title">
        <div className={styles.heroArt}>
          <LocationHouse />
        </div>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Location guide · Pampanga</p>
          <h1 id="locations-title" className={styles.heroTitle}>
            Find the right place for your next home.
          </h1>
          <p className={styles.heroLede}>
            Explore Pampanga by area and discover homes in the communities that suit
            your priorities and lifestyle.
          </p>
          <a href="#featured-locations" className={`${styles.heroAction} cta`}>
            <RollLabel>Explore locations</RollLabel>
            <Arrow />
          </a>
        </div>
      </section>

      {/* 2. Featured locations */}
      <section
        id="featured-locations"
        className={styles.featured}
        aria-labelledby="featured-title"
      >
        <div className={styles.featuredInner}>
          <div className={styles.featuredHead}>
            <p className={styles.eyebrowLight}>Featured locations</p>
            <h2 id="featured-title" className={styles.sectionTitleLight}>
              Four places to start your search.
            </h2>
          </div>
          <FeaturedLocations inventory={inventory} />
        </div>
      </section>

      {/* 3. Pampanga explorer */}
      <section className={styles.explorer} aria-labelledby="explorer-title">
        <div className={styles.explorerInner}>
          <div className={styles.explorerHead}>
            <p className={styles.eyebrow}>Pampanga explorer</p>
            <h2 id="explorer-title" className={styles.sectionTitle}>
              See where each area sits.
            </h2>
          </div>
          <LocationExplorer locations={explorerLocations} />
        </div>
      </section>

      {/* 4. Homes by location */}
      <section className={styles.homes} aria-labelledby="homes-title">
        <div className={styles.homesInner}>
          <div className={styles.homesHead}>
            <div className={styles.homesHeadCopy}>
              <p className={styles.eyebrow}>Homes by location</p>
              <h2 id="homes-title" className={styles.sectionTitle}>
                Explore available homes in Pampanga.
              </h2>
            </div>
            <Link href="/properties" className={`${styles.quietAction} cta`}>
              <RollLabel>Browse all properties</RollLabel>
              <Arrow />
            </Link>
          </div>
          <LocationHomes locations={homesLocations} />
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
