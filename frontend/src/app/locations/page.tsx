import locationImage from "@/assets/site/location.png";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { PageMotion } from "@/components/layout/PageMotion";
import { HomeHeroCover } from "@/features/home/HomeHeroCover";
import { FeaturedPropertiesSection } from "@/features/home/FeaturedProperties";
import { FeaturedLocations } from "@/features/locations/FeaturedLocations";
import {
  LocationsHero,
  LocationsStatement,
  LocationsGuidance,
} from "@/features/locations/LocationsHero";
import { buildLocationsMetadata } from "@/features/locations/location-seo";
import styles from "@/features/locations/locations-index.module.css";

export const dynamic = "force-dynamic";
export const metadata = buildLocationsMetadata(locationImage.src);

export default function LocationsPage({ searchParams }: PageProps<"/locations">) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`${frame.page} ${frame.flush} ${styles.page}`}
      data-locations-page
      data-layered-hero
    >
      <PageMotion />
      <HomeHeroCover />
      <LocationsHero />
      <div data-home-hero-end aria-hidden="true" />
      <LocationsStatement />

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
          <FeaturedLocations />
        </div>
      </section>

      <FeaturedPropertiesSection searchParams={searchParams} variant="locations" />

      <LocationsGuidance />

      {/* 4. Closing */}
      <EditorialCta
        id="locations-cta-heading"
        eyebrow="Not sure where to begin?"
        headline={["Tell us what", "*matters* most."]}
        body="RC Premier can help narrow the search around preferred locations and property needs."
        label="Talk to RC Premier"
        href="/contact"
        wide
      />
    </main>
  );
}
