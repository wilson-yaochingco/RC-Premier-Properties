import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/brand/rc-premier-logo.png";
import heroExterior from "@/assets/site/home-hero-1.png";
import locationImage from "@/assets/site/location.png";
import propertiesImage from "@/assets/site/properties.png";
import whyImage from "@/assets/site/why-rc-premier.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeaturedVideos } from "@/features/home/FeaturedVideos";
import { HeroPropertySearch } from "@/features/home/HeroPropertySearch";
import { PropertyCard } from "@/features/properties/PropertyCard";
import {
  getFeaturedProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import propertyStyles from "@/features/properties/properties.module.css";
import { buildSiteStructuredData, serializeJsonLd } from "@/lib/seo";
import { publicLocationPath } from "@/lib/public-location";

export const dynamic = "force-dynamic";

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

async function ExploreLocations() {
  let facets;
  try {
    facets = await getPropertyFacets();
  } catch {
    facets = undefined;
  }

  const locations = facets?.locationCounts ?? [];
  if (locations.length > 0) {
    return (
      <ul className="location-list">
        {locations.map(({ location, count }) => (
          <li key={location}>
            <Link href={publicLocationPath(location)}>
              <span>{location}</span>
              <span>
                {count} {count === 1 ? "Property" : "Properties"}
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (!facets) {
    return (
      <EmptyState
        title="Location inventory is temporarily unavailable."
        description="This section will populate only from connected, published properties."
        actionLabel="Browse Properties"
        actionHref="/properties"
      />
    );
  }

  return (
    <EmptyState
      title="Published locations will appear here."
      description="Location links and counts are shown only when connected, published inventory supports them."
      actionLabel="Browse All Properties"
      actionHref="/properties"
    />
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

      <section className="home-hero" aria-labelledby="home-heading">
        <Image
          src={heroExterior}
          alt="Modern Pampanga home with a sloping roof and landscaped frontage"
          fill
          preload
          sizes="100vw"
          className="home-hero__image"
        />
        <div className="home-hero__shade" aria-hidden="true" />
        <Container className="home-hero__inner">
          <div className="home-hero__content">
            <p className="eyebrow">Homes for sale in Pampanga</p>
            <h1 id="home-heading">Find your place.</h1>
            <p className="home-hero__intro">
              Search current residential listings and take the next step with clear,
              direct support.
            </p>
            <HeroPropertySearch />
          </div>
        </Container>
      </section>

      <Section className="home-featured" aria-labelledby="featured-heading">
        <Container className="home-container">
          <SectionHeading
            className="home-heading"
            eyebrow="Featured properties"
            title={<span id="featured-heading">Explore homes on the market.</span>}
            intro="A selection from connected, published RC Premier Properties inventory."
          />
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
          <Button href="/properties" className="home-featured__action">
            View all properties
          </Button>
        </Container>
      </Section>

      <aside className="home-viewing-callout" aria-label="Viewing requests">
        <Container className="home-container home-viewing-callout__inner">
          <p>Found a property you want to see?</p>
          <Button href="/book-viewing" variant="secondary">
            Request a viewing
          </Button>
        </Container>
      </aside>

      <Section className="home-service" aria-labelledby="why-heading">
        <Container className="home-container home-service__layout">
          <div
            className="home-service__media"
            role="group"
            aria-label="RC Premier property interiors"
          >
            <figure>
              <Image
                src={propertiesImage}
                alt="Warm modern living room with a staircase"
                fill
                sizes="(max-width: 800px) 50vw, 25rem"
              />
              <figcaption>Thoughtful interiors</figcaption>
            </figure>
            <figure>
              <Image
                src={whyImage}
                alt="Double-height home entrance with sculptural gold pendant lights"
                fill
                sizes="(max-width: 800px) 50vw, 25rem"
              />
              <figcaption>Distinctive details</figcaption>
            </figure>
          </div>
          <div className="home-service__content">
            <p className="eyebrow">Why RC Premier Properties</p>
            <h2 id="why-heading">A clearer way to explore your next home.</h2>
            <p>
              Review available properties, compare the details that matter, and send
              questions or a viewing request through one connected experience.
            </p>
            <Button href="/about" variant="outline">
              Learn about us
            </Button>
          </div>
        </Container>
      </Section>

      <Section
        id="locations"
        className="home-locations"
        tone="soft"
        aria-labelledby="locations-heading"
      >
        <Container className="home-container">
          <SectionHeading
            className="home-heading"
            eyebrow="Explore by location"
            title={<span id="locations-heading">Find the area for you.</span>}
            intro="Every location and property count comes directly from current published inventory."
          />
          <figure className="home-locations__image">
            <Image
              src={locationImage}
              alt="Contemporary multi-story Pampanga residence under a blue sky"
              fill
              sizes="(max-width: 800px) 100vw, 70rem"
            />
          </figure>
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
        </Container>
      </Section>

      <Section className="home-videos" tone="dark" aria-labelledby="videos-heading">
        <Container className="home-container">
          <SectionHeading
            className="home-heading"
            eyebrow="Featured property videos"
            title={<span id="videos-heading">Tour a little closer.</span>}
            intro="Choose a short tour when you are ready. YouTube loads only for the video you select."
          />
          <FeaturedVideos />
        </Container>
      </Section>
    </main>
  );
}
