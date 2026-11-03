import Image from "next/image";
import Link from "next/link";
import type { PropertyFacetsResponse, PublicPropertySummary } from "@rc/shared";
import homeHeroOne from "@/assets/site/home-hero-1.png";
import homeHeroTwo from "@/assets/site/home-hero-2.png";
import interludeImage from "@/assets/site/home-hero-level18.jpg";
import locationImage from "@/assets/site/location.png";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { RollLabel } from "@/components/ui/RollLabel";
import { LocationAtlas, type AtlasLocation } from "@/features/locations/LocationAtlas";
import {
  LocationStories,
  type LocationStory,
} from "@/features/locations/LocationStories";
import { getLocationEditorialContent } from "@/features/locations/location-content";
import { buildLocationsMetadata } from "@/features/locations/location-seo";
import styles from "@/features/locations/location-atlas.module.css";
import { PropertyCatalogCard } from "@/features/properties/PropertyCatalogCard";
import {
  getProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import {
  publicLocationPath,
  publicLocationSlug,
  shortPublicLocation,
} from "@/lib/public-location";

export const dynamic = "force-dynamic";
export const metadata = buildLocationsMetadata(locationImage.src);

/** Stories stay a curated reading length; the atlas ledger above lists every area. */
const STORY_LIMIT = 6;
const COLLECTION_LIMIT = 4;
const FALLBACK_IMAGES = [homeHeroOne, homeHeroTwo, locationImage] as const;

const CONSIDERATIONS = [
  {
    number: "01",
    title: "Daily routine",
    description:
      "Consider work, school, family and the places you return to regularly.",
  },
  {
    number: "02",
    title: "Property type",
    description:
      "Different locations can offer different residential settings and current inventory.",
  },
  {
    number: "03",
    title: "Access",
    description:
      "Think about the roads and destinations that matter to your own routine.",
  },
  {
    number: "04",
    title: "Site visit",
    description:
      "A listing gives context; seeing the property and its surroundings completes the picture.",
  },
] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

async function loadFacets(): Promise<PropertyFacetsResponse | undefined> {
  try {
    return await getPropertyFacets();
  } catch {
    return undefined;
  }
}

async function loadCollection(): Promise<PublicPropertySummary[]> {
  try {
    return (await getProperties({ sort: "newest" }, undefined, COLLECTION_LIMIT)).items;
  } catch {
    return [];
  }
}

export default async function LocationsPage() {
  const [facets, collection] = await Promise.all([loadFacets(), loadCollection()]);
  const counts = (facets?.locationCounts ?? [])
    .filter(({ count }) => count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        shortPublicLocation(a.location).localeCompare(shortPublicLocation(b.location)),
    );

  const locations: AtlasLocation[] = counts.map(({ location, count }) => ({
    slug: publicLocationSlug(location),
    name: shortPublicLocation(location),
    href: publicLocationPath(location),
    count,
  }));
  const stories: LocationStory[] = counts
    .slice(0, STORY_LIMIT)
    .map(({ location, count }, index) => {
      const content = getLocationEditorialContent(location);
      return {
        slug: publicLocationSlug(location),
        name: shortPublicLocation(location),
        href: publicLocationPath(location),
        count,
        ...(content ? { content } : {}),
        fallbackImage: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]!,
      };
    });
  const totalHomes = counts.reduce((sum, { count }) => sum + count, 0);

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      {/* 1. Editorial opening */}
      <section className={styles.opening} aria-labelledby="locations-title">
        <div className={styles.openingInner}>
          <div className={styles.openingCopy}>
            <p className={styles.eyebrow}>Location guide · Pampanga</p>
            <h1 id="locations-title" className={styles.openingTitle}>
              <span>Where you live</span> <span>shapes how you live.</span>
            </h1>
            <div className={styles.openingFoot}>
              <p className={styles.openingLede}>
                Explore the places across Pampanga where RC Premier currently has
                published homes, then step into each area’s listings.
              </p>
              {totalHomes > 0 ? (
                <dl className={styles.summary}>
                  <div>
                    <dt>Current locations</dt>
                    <dd>{locations.length.toLocaleString("en-PH")}</dd>
                  </div>
                  <div>
                    <dt>Published homes</dt>
                    <dd>{totalHomes.toLocaleString("en-PH")}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
            <a href="#atlas" className={styles.scrollCue}>
              <span>Explore the atlas</span>
              <span className={styles.scrollLine} aria-hidden="true" />
            </a>
          </div>
          <figure className={styles.openingSlice}>
            <Image
              src={locationImage}
              alt="Contemporary residence with timber soffits rising against a bright sky"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 30vw"
            />
          </figure>
        </div>
      </section>

      {/* 2. Atlas */}
      <section id="atlas" className={styles.atlasSection} aria-labelledby="atlas-title">
        <div className={styles.container}>
          <div className={styles.atlasHeader}>
            <p className={styles.eyebrowLight}>Explore Pampanga</p>
            <h2 id="atlas-title" className={styles.sectionTitleLight}>
              <span>Current homes,</span> <span>placed in context.</span>
            </h2>
            <p className={styles.atlasNote}>
              {locations.length
                ? "Every area and count reflects current published homes for sale."
                : facets
                  ? "Published locations appear here as soon as current homes are available in an area."
                  : "Location inventory is temporarily unavailable. No sample locations or counts have been substituted."}
            </p>
          </div>
          <LocationAtlas locations={locations} />
          {!locations.length ? (
            <Link href="/properties" className={`${styles.lightButton} cta`}>
              <RollLabel>Browse properties</RollLabel>
              <Arrow />
            </Link>
          ) : null}
          <p className={styles.sourceNote}>
            Boundary data:{" "}
            <a
              href="https://data.humdata.org/dataset/cod-ab-phl"
              rel="noreferrer"
              target="_blank"
            >
              OCHA/NAMRIA/PSA
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/igo/"
              rel="noreferrer"
              target="_blank"
            >
              CC BY 3.0 IGO
            </a>
            . Simplified; areas are approximate.
          </p>
        </div>
      </section>

      {/* 3. Location stories */}
      {stories.length ? (
        <section className={styles.storiesSection} aria-labelledby="stories-title">
          <div className={styles.container}>
            <div className={styles.splitHeader}>
              <p className={styles.eyebrow}>Current locations</p>
              <h2 id="stories-title" className={styles.sectionTitle}>
                Explore one area at a time.
              </h2>
            </div>
            <LocationStories stories={stories} />
            {locations.length > stories.length ? (
              <p className={styles.moreAreas}>
                {locations.length - stories.length} more{" "}
                {locations.length - stories.length === 1
                  ? "area appears"
                  : "areas appear"}{" "}
                in the <a href="#atlas">atlas index</a>.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 4. Choosing a location */}
      <section className={styles.choosing} aria-labelledby="choosing-title">
        <div className={styles.container}>
          <div className={styles.choosingLayout}>
            <div className={styles.choosingIntro}>
              <p className={styles.eyebrow}>Choosing a location</p>
              <h2 id="choosing-title" className={styles.sectionTitle}>
                A location should work beyond the address.
              </h2>
            </div>
            <ol className={styles.considerations}>
              {CONSIDERATIONS.map((item) => (
                <li key={item.number}>
                  <span className={styles.considerationNumber} aria-hidden="true">
                    {item.number}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 5. Current collection */}
      {collection.length ? (
        <section className={styles.collection} aria-labelledby="collection-title">
          <div className={styles.container}>
            <div className={styles.collectionHeader}>
              <div>
                <p className={styles.eyebrow}>Current collection</p>
                <h2 id="collection-title" className={styles.sectionTitle}>
                  Homes from around the province.
                </h2>
              </div>
              <Link href="/properties" className={`${styles.darkButton} cta`}>
                <RollLabel>View all properties</RollLabel>
                <Arrow />
              </Link>
            </div>
            <div className={styles.collectionGrid} data-count={collection.length}>
              {collection.map((property) => (
                <PropertyCatalogCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. Architectural interlude */}
      <section className={styles.interlude} aria-labelledby="interlude-title">
        <Image
          src={interludeImage}
          alt=""
          fill
          sizes="100vw"
          className={styles.interludeImage}
        />
        <div className={styles.interludeShade} aria-hidden="true" />
        <h2 id="interlude-title" className={styles.interludeTitle}>
          <span>The right home starts with</span> <span>the right place.</span>
        </h2>
      </section>

      {/* 7. Closing */}
      <EditorialCta
        id="locations-cta-heading"
        eyebrow="Not sure where to begin?"
        headline={["Tell us what", "matters most."]}
        body="RC Premier can help narrow the search around preferred locations and property needs."
        label="Talk to RC Premier"
        href="/contact"
      />
    </main>
  );
}
