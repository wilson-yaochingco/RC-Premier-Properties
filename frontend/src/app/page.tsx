import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import heroExterior from "@/assets/site/home-hero-1.png";
import heroPool from "@/assets/site/home-hero-2.png";
import heroInterior from "@/assets/site/home-hero-3.png";
import logo from "@/assets/brand/rc-premier-logo.png";
import locationImage from "@/assets/site/location.png";
import propertiesImage from "@/assets/site/properties.png";
import viewingImage from "@/assets/site/book-viewing.png";
import whyImage from "@/assets/site/why-rc-premier.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeaturedVideos } from "@/features/home/FeaturedVideos";
import { PropertyCard } from "@/features/properties/PropertyCard";
import {
  getFeaturedProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import propertyStyles from "@/features/properties/properties.module.css";
import { buildSiteStructuredData, serializeJsonLd } from "@/lib/seo";

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
      <div className={propertyStyles.grid}>
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
            <Link href={`/properties?location=${encodeURIComponent(location)}`}>
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
      <Section className="home-hero" tone="soft" aria-labelledby="home-heading">
        <Container>
          <div className="home-hero__layout">
            <div className="home-hero__content">
              <p className="eyebrow">Pampanga, Philippines</p>
              <h1 id="home-heading">Find a home that feels right.</h1>
              <p>
                Browse houses and residential properties for sale in Pampanga, with
                Angeles City as a primary focus.
              </p>
              <div className="home-hero__actions">
                <Button href="/properties">Browse Properties</Button>
                <Button href="/book-viewing" variant="outline">
                  Book a Viewing
                </Button>
              </div>
            </div>
            <div
              className="home-hero__collage"
              aria-label="RC Premier property photography"
            >
              <figure className="home-hero__photo home-hero__photo--wide">
                <Image
                  src={heroExterior}
                  alt="Modern Pampanga home with a sloping roof and landscaped frontage"
                  fill
                  priority
                  sizes="(max-width: 800px) 100vw, 52vw"
                />
              </figure>
              <figure className="home-hero__photo">
                <Image
                  src={heroPool}
                  alt="Residential courtyard with a tiled pool and blue sky"
                  fill
                  sizes="(max-width: 800px) 48vw, 23vw"
                />
              </figure>
              <figure className="home-hero__photo">
                <Image
                  src={heroInterior}
                  alt="High-ceiling living and dining area with warm wood details"
                  fill
                  sizes="(max-width: 800px) 48vw, 23vw"
                />
              </figure>
            </div>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="featured-heading">
        <Container>
          <div className="home-section-intro">
            <SectionHeading
              number="002"
              eyebrow="Featured properties"
              title={
                <span id="featured-heading">
                  Homes selected from current inventory.
                </span>
              }
              intro="Only connected, published listings appear here."
            />
            <figure className="home-section-intro__image">
              <Image
                src={propertiesImage}
                alt="Warm modern living room with a staircase"
                fill
                sizes="22rem"
              />
            </figure>
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
      </Section>

      <Section id="locations" tone="soft" aria-labelledby="locations-heading">
        <Container>
          <SectionHeading
            number="003"
            eyebrow="Explore Properties by Location"
            title={
              <span id="locations-heading">Start with the area that suits you.</span>
            }
            intro="Areas and property counts come directly from current published inventory."
          />
          <div className="location-explorer">
            <figure>
              <Image
                src={locationImage}
                alt="Contemporary multi-story Pampanga residence under a blue sky"
                fill
                sizes="(max-width: 800px) 100vw, 45vw"
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
          </div>
        </Container>
      </Section>

      <Section tone="dark" aria-labelledby="videos-heading">
        <Container>
          <SectionHeading
            number="004"
            eyebrow="Featured Property Videos"
            title={<span id="videos-heading">Take a closer look.</span>}
            intro="Play a short property video when you are ready. Players load only after you choose one."
          />
          <FeaturedVideos />
        </Container>
      </Section>

      <Section aria-labelledby="why-heading">
        <Container className="why-premier">
          <figure>
            <Image
              src={whyImage}
              alt="Double-height home entrance with sculptural gold pendant lights"
              fill
              sizes="(max-width: 800px) 100vw, 45vw"
            />
          </figure>
          <div>
            <p className="eyebrow">005 · Why RC Premier Properties</p>
            <h2 id="why-heading">Clear information. Direct next steps.</h2>
            <p>
              Explore available listings, review property details and locations, ask
              questions, and request a viewing through one connected experience.
            </p>
            <Button href="/about" variant="text">
              About RC Premier Properties
            </Button>
          </div>
        </Container>
      </Section>

      <Section className="home-contact" tone="accent" aria-labelledby="contact-heading">
        <Container className="home-contact__layout">
          <div>
            <p className="eyebrow">006 · Ready to visit?</p>
            <h2 id="contact-heading">Request a viewing or ask about a property.</h2>
            <div className="home-hero__actions">
              <Button href="/book-viewing" variant="primary">
                Book a Viewing
              </Button>
              <Button href="/contact" variant="outline">
                Contact Us
              </Button>
            </div>
          </div>
          <figure>
            <Image
              src={viewingImage}
              alt="Landscaped private garden beside a residence"
              fill
              sizes="(max-width: 800px) 100vw, 42vw"
            />
          </figure>
        </Container>
      </Section>
    </main>
  );
}
