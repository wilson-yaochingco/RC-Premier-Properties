import Image from "next/image";
import Link from "next/link";
import homeHeroOne from "@/assets/site/home-hero-1.png";
import homeHeroTwo from "@/assets/site/home-hero-2.png";
import homeHeroThree from "@/assets/site/home-hero-3.png";
import locationImage from "@/assets/site/location.png";
import locationsDoodle from "@/assets/site/locations-doodle.png";
import propertiesImage from "@/assets/site/properties.png";
import whyImage from "@/assets/site/why-rc-premier.png";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocationCard } from "@/features/locations/LocationCard";
import { getLocationEditorialContent } from "@/features/locations/location-content";
import { buildLocationsMetadata } from "@/features/locations/location-seo";
import styles from "@/features/locations/locations.module.css";
import { getPropertyFacets } from "@/features/properties/property.service";

export const dynamic = "force-dynamic";
export const metadata = buildLocationsMetadata(locationImage.src);

const locationImages = [
  locationImage,
  homeHeroOne,
  homeHeroTwo,
  homeHeroThree,
  propertiesImage,
  whyImage,
] as const;

export default async function LocationsPage() {
  let facets;
  try {
    facets = await getPropertyFacets();
  } catch {
    facets = undefined;
  }
  const locations = facets?.locationCounts ?? [];

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.intro} aria-labelledby="locations-title">
        <Container className={styles.guideContainer}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Locations</span>
          </nav>
          <div className={styles.introGrid}>
            <div className={styles.introStatement}>
              <p>Location guide · Pampanga</p>
              <h1 id="locations-title">Explore the places behind the properties.</h1>
            </div>
            <figure className={styles.introMedia}>
              <Image
                src={locationsDoodle}
                alt="Line drawing of homes, trees, a bicycle, and neighborhood streets"
                fill
                sizes="(max-width: 767px) 1px, (max-width: 1023px) 100vw, 50vw"
              />
            </figure>
          </div>
        </Container>
      </section>

      <section
        className={styles.locationsSection}
        aria-labelledby="location-grid-title"
      >
        <Container className={styles.guideContainer}>
          <div className={styles.sectionHeading}>
            <h2 id="location-grid-title">Browse current property locations.</h2>
            <p>
              Every area and count comes from connected, published residential-sale
              inventory.
            </p>
          </div>

          {locations.length > 0 ? (
            <ul className={styles.locationGrid}>
              {locations.map(({ location, count }, index) => (
                <LocationCard
                  key={location}
                  location={location}
                  count={count}
                  image={
                    getLocationEditorialContent(location)?.scenery.imagePath ??
                    locationImages[index % locationImages.length]!
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              eyebrow={facets ? "Location collection" : "Location interruption"}
              title={
                facets
                  ? "Published locations will appear here."
                  : "Location inventory is temporarily unavailable."
              }
              description={
                facets
                  ? "This guide is populated only when connected, published inventory supports a location."
                  : "The property service could not be reached. No sample locations or counts have been substituted."
              }
              actionLabel="Browse properties"
              actionHref="/properties"
            />
          )}
        </Container>
      </section>
    </main>
  );
}
