import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/brand/rc-premier-logo.png";
import heroLogo from "@/assets/brand/rc-premier-logo-white.png";
import heroExterior from "@/assets/site/home_hero.jpg";
import whyImage from "@/assets/site/why-rc-premier.png";
import homeHeroTwo from "@/assets/site/home-hero-2.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeaturedVideos } from "@/features/home/FeaturedVideos";
import { HomeIntroduction } from "@/features/home/HomeIntroduction";
import heroStyles from "@/features/home/hero.module.css";
import { getLocationEditorialContent } from "@/features/locations/location-content";
import { PropertyCard } from "@/features/properties/PropertyCard";
import {
  getFeaturedProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import propertyStyles from "@/features/properties/properties.module.css";
import { buildSiteStructuredData, serializeJsonLd } from "@/lib/seo";
import { publicLocationPath } from "@/lib/public-location";

export const dynamic = "force-dynamic";

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="link-arrow" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.333 8h9.334m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeroArrowIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PillarIcon({ type }: { type: "target" | "shield" | "handshake" }) {
  if (type === "target") {
    return (
      <svg
        aria-hidden="true"
        className="value-pillar__icon"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (type === "shield") {
    return (
      <svg
        aria-hidden="true"
        className="value-pillar__icon"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2.5 4.5 5.75v6.25c0 5.25 3.25 9.75 7.5 11 4.25-1.25 7.5-5.75 7.5-11V5.75L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m9 11.5 2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="value-pillar__icon"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7.5v4.5l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      aria-hidden="true"
      className="location-item__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="m12.5 7.5-1.875 4.375L7.5 12.5l1.875-4.375L12.5 7.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonogramIcon() {
  return (
    <svg
      aria-hidden="true"
      className="home-closing__monogram"
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M17 31V17h6a4.5 4.5 0 0 1 4.5 4.5c0 2.25-1.5 4-3.5 4.4L28 31h-3.2l-3.5-5h-1.8v5H17Zm2.5-7.5h3.2a2.25 2.25 0 0 0 0-4.5h-3.2v4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

async function FeaturedProperties() {
  let result;
  try {
    result = await getFeaturedProperties();
  } catch {
    result = undefined;
  }

  if (result?.items.length) {
    return (
      <div className={`${propertyStyles.grid} home-featured-grid`}>
        {result.items.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="Featured inventory is temporarily unavailable."
        description="The property service could not be reached. No sample listings have been substituted."
        actionLabel="Browse Properties"
        actionHref="/properties"
      />
    );
  }

  return (
    <EmptyState
      title="Featured properties will appear here."
      description="There are no published featured properties to show yet. Browse all published properties for current availability."
      actionLabel="Browse All Properties"
      actionHref="/properties"
    />
  );
}

const PRIMARY_LOCATIONS = [
  "Angeles City",
  "Mabalacat City",
  "City of San Fernando",
  "Porac",
] as const;

async function ExploreLocations() {
  let facets;
  try {
    facets = await getPropertyFacets();
  } catch {
    facets = undefined;
  }

  const countsMap = new Map<string, number>();
  if (facets?.locationCounts) {
    for (const item of facets.locationCounts) {
      countsMap.set(item.location.toLowerCase(), item.count);
    }
  }

  return (
    <div className="home-locations__grid">
      {PRIMARY_LOCATIONS.map((locName) => {
        const editorial = getLocationEditorialContent(locName);
        const count = countsMap.get(locName.toLowerCase());
        const displayLabel = locName === "Mabalacat City" ? "Mabalacat" : locName;
        const imgPath =
          editorial?.scenery.imagePath ?? "/images/locations/angeles-city.jpg";

        return (
          <Link
            key={locName}
            href={publicLocationPath(locName)}
            className="home-location-item"
            aria-label={`Explore properties in ${displayLabel}`}
          >
            <div className="home-location-item__image-wrap">
              <Image
                src={imgPath}
                alt={`${displayLabel}, Pampanga`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="home-location-item__image"
              />
              <div className="home-location-item__overlay" aria-hidden="true" />
            </div>

            <div className="home-location-item__badge" aria-hidden="true">
              <CompassIcon />
            </div>

            <div className="home-location-item__content">
              <strong className="home-location-item__title">{displayLabel}</strong>
              <span className="home-location-item__meta">
                {count !== undefined
                  ? `${count} ${count === 1 ? "Property" : "Properties"}`
                  : "Properties"}
                <ArrowRightIcon />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const structuredData = buildSiteStructuredData(logo.src);

  return (
    <main id="main-content" tabIndex={-1}>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}

      {/* 1. HERO SECTION */}
      <section
        className={heroStyles.hero}
        aria-labelledby="home-heading"
        data-home-hero
      >
        <div className={heroStyles.backdrop}>
          <Image
            src={heroExterior}
            alt="Modern luxury home at twilight with warm interior lighting and landscaped frontage"
            fill
            priority
            sizes="(max-width: 768px) 180vh, 100vw"
            className={heroStyles.image}
          />
          <div className={heroStyles.shade} aria-hidden="true" />
        </div>

        <div className={heroStyles.content}>
          <Image
            src={heroLogo}
            alt="RC Premier Properties"
            sizes="160px"
            className={heroStyles.logo}
          />
          <h1 id="home-heading" className={heroStyles.title}>
            Find a home
            <br />
            worth coming
            <br />
            home to.
          </h1>
          <p className={heroStyles.intro}>
            Explore homes and properties across Pampanga with straightforward guidance
            from RC Premier.
          </p>
          <Link href="/properties" className={heroStyles.textLink}>
            <HeroArrowIcon />
            <span>Browse properties</span>
          </Link>
        </div>
        <aside className={heroStyles.card} aria-label="Explore locations">
          <div className={heroStyles.cardImage}>
            <Image
              src={homeHeroTwo}
              alt="Contemporary RC Premier residential exterior"
              fill
              sizes="320px"
            />
          </div>
          <p>Explore available homes and properties across Pampanga.</p>
          <Link href="/locations" className={heroStyles.textLink}>
            <span>Explore locations</span>
            <HeroArrowIcon />
          </Link>
        </aside>
        <div className={heroStyles.scroll} aria-hidden="true">
          <span />
        </div>
      </section>

      <HomeIntroduction />

      {/* 3. FEATURED PROPERTIES */}
      <section className="home-featured" aria-labelledby="featured-heading">
        <Container className="home-featured__inner">
          <div className="home-section-header">
            <div>
              <p className="section-eyebrow">— FEATURED PROPERTIES</p>
              <h2 id="featured-heading" className="home-section-title">
                Homes worth a closer look.
              </h2>
            </div>
            <Link href="/properties" className="home-section-link">
              <span>View all properties</span>
              <ArrowRightIcon />
            </Link>
          </div>

          <Suspense
            fallback={
              <EmptyState
                title="Loading featured properties."
                description="Current published inventory is being checked."
              />
            }
          >
            <FeaturedProperties />
          </Suspense>
        </Container>
      </section>

      {/* 4. DARK BRAND / VALUE SECTION */}
      <section className="home-values" aria-labelledby="values-heading">
        <Container className="home-values__inner">
          <div className="home-values__media">
            <Image
              src={whyImage}
              alt="Warmly lit dining area in a contemporary residence"
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
              className="home-values__image"
            />
          </div>

          <div className="home-values__content">
            <p className="section-eyebrow section-eyebrow--gold">
              — WHY CHOOSE RC PREMIER
            </p>
            <h2 id="values-heading" className="home-values__title">
              Local knowledge.
              <br />
              Real opportunities.
            </h2>
            <p className="home-values__text">
              With a deep understanding of the Pampanga real estate market, we help you
              find properties that match your goals — whether you&apos;re looking for a
              home, an investment, or the right buyer.
            </p>

            <div className="home-values__pillars">
              <div className="value-pillar">
                <div className="value-pillar__icon-wrap">
                  <PillarIcon type="target" />
                </div>
                <div className="value-pillar__body">
                  <h3 className="value-pillar__title">Pampanga-focused</h3>
                  <p className="value-pillar__desc">
                    Local insight and market knowledge
                  </p>
                </div>
              </div>

              <div className="value-pillar">
                <div className="value-pillar__icon-wrap">
                  <PillarIcon type="shield" />
                </div>
                <div className="value-pillar__body">
                  <h3 className="value-pillar__title">Trusted guidance</h3>
                  <p className="value-pillar__desc">Clear and honest property advice</p>
                </div>
              </div>

              <div className="value-pillar">
                <div className="value-pillar__icon-wrap">
                  <PillarIcon type="handshake" />
                </div>
                <div className="value-pillar__body">
                  <h3 className="value-pillar__title">End-to-end support</h3>
                  <p className="value-pillar__desc">
                    From search to turnover and beyond
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. LOCATIONS SECTION */}
      <section className="home-locations" aria-labelledby="locations-heading">
        <Container className="home-locations__inner">
          <div className="home-locations__intro-col">
            <p className="section-eyebrow">— EXPLORE BY LOCATION</p>
            <h2 id="locations-heading" className="home-section-title">
              Properties across
              <br />
              Pampanga.
            </h2>
            <p className="home-locations__text">
              Discover homes and real estate opportunities in key cities and
              municipalities.
            </p>
            <Link href="/locations" className="home-section-link">
              <span>View all locations</span>
              <ArrowRightIcon />
            </Link>
          </div>

          <div className="home-locations__cards-col">
            <Suspense
              fallback={
                <EmptyState
                  title="Loading locations."
                  description="Published inventory is being checked."
                />
              }
            >
              <ExploreLocations />
            </Suspense>
          </div>
        </Container>
      </section>

      {/* 6. SELLER SECTION */}
      <section className="home-seller" aria-labelledby="seller-heading">
        <Container className="home-seller__inner">
          <div className="home-seller__media">
            <Image
              src={homeHeroTwo}
              alt="Distinctive modern house exterior with architectural landscaping"
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
              className="home-seller__image"
            />
          </div>

          <div className="home-seller__panel">
            <p className="section-eyebrow">— LOOKING TO SELL?</p>
            <h2 id="seller-heading" className="home-seller__title">
              Let&apos;s find the right
              <br />
              opportunity for your property.
            </h2>
            <p className="home-seller__text">
              Reach out to RC Premier Properties and let our team help you connect with
              the right buyers.
            </p>
            <div className="home-seller__action">
              <Button href="/sell" variant="gold">
                Sell Your Property
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* 7. FEATURED VIDEOS TOURS */}
      <section className="home-videos" aria-labelledby="videos-heading">
        <Container className="home-videos__inner">
          <div className="home-section-header">
            <div>
              <p className="section-eyebrow">— FEATURED PROPERTY TOURS</p>
              <h2 id="videos-heading" className="home-section-title">
                Tour a little closer.
              </h2>
            </div>
            <p className="home-section-header-note">
              Choose a short property video tour when you are ready to watch.
            </p>
          </div>
          <FeaturedVideos />
        </Container>
      </section>

      {/* 8. FINAL CLOSING CTA SECTION */}
      <section className="home-closing" aria-labelledby="closing-heading">
        <Container className="home-closing__inner">
          <div className="home-closing__main">
            <p className="section-eyebrow section-eyebrow--gold">
              — READY TO FIND YOUR NEXT HOME?
            </p>
            <h2 id="closing-heading" className="home-closing__title">
              Browse available properties
              <br />
              in Pampanga today.
            </h2>
            <div className="home-closing__cta">
              <Button href="/properties" variant="gold">
                Browse Properties
              </Button>
            </div>
          </div>

          <div className="home-closing__divider" aria-hidden="true" />

          <div className="home-closing__aside">
            <div className="home-closing__aside-icon">
              <MonogramIcon />
            </div>
            <h3 className="home-closing__aside-title">Have questions?</h3>
            <p className="home-closing__aside-text">Our team is here to help you.</p>
            <div className="home-closing__aside-cta">
              <Button href="/contact" variant="outline">
                Contact Us
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
