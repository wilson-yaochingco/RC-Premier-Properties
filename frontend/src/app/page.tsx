import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES, type PropertyType } from "@rc/shared";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PropertyCard } from "@/features/properties/PropertyCard";
import { getFeaturedProperties } from "@/features/properties/property.service";
import propertyStyles from "@/features/properties/properties.module.css";

export const dynamic = "force-dynamic";

const propertyCategories: ReadonlyArray<{
  type: PropertyType;
  title: string;
  description: string;
}> = [
  {
    type: "house-and-lot",
    title: "House & lot",
    description: "Residential options with room to settle and grow.",
  },
  {
    type: "condominium",
    title: "Condominiums",
    description: "Connected living with location and convenience in focus.",
  },
  {
    type: "lot",
    title: "Lots & land",
    description: "A starting point for plans that need their own footprint.",
  },
  {
    type: "commercial",
    title: "Commercial",
    description: "Spaces to consider for business and investment goals.",
  },
];

const approach = [
  {
    number: "01",
    title: "Begin with priorities",
    description:
      "Define the location, property type, budget, and practical details that shape the search.",
  },
  {
    number: "02",
    title: "Compare with context",
    description:
      "Review relevant listing information in a clear format designed for considered decisions.",
  },
  {
    number: "03",
    title: "Choose the next step",
    description:
      "Ask a question, discuss a property, or arrange a viewing when you are ready.",
  },
] as const;

async function FeaturedProperties() {
  let featuredProperties;

  try {
    featuredProperties = await getFeaturedProperties();
  } catch {
    featuredProperties = undefined;
  }

  return featuredProperties && featuredProperties.items.length > 0 ? (
    <div className={propertyStyles.grid}>
      {featuredProperties.items.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  ) : (
    <EmptyState
      title={
        featuredProperties
          ? "Featured listings will appear here."
          : "Featured inventory is temporarily unavailable."
      }
      description={
        featuredProperties
          ? "There are no published featured properties to show yet. Browse the full catalogue for the latest available inventory."
          : "The property API could not be reached. This section will populate only from connected, published inventory."
      }
      actionLabel="Browse all properties"
      actionHref="/properties"
    />
  );
}

function FeaturedPropertiesFallback() {
  return (
    <EmptyState
      title="Loading featured properties."
      description="The editorial page remains available while current published inventory is checked."
    />
  );
}

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Section className="home-hero" tone="soft" aria-labelledby="home-heading">
        <Container>
          <div className="chapter-label">
            <span aria-hidden="true">001</span>
            <p>Angeles City · Pampanga</p>
          </div>

          <div className="home-hero__heading">
            <h1 id="home-heading">
              A more considered way
              <span>to find your place.</span>
            </h1>
            <div className="home-hero__introduction">
              <p>
                Explore property opportunities in Angeles City and across Pampanga
                through a clear, calm, and thoughtfully designed experience.
              </p>
              <Button href="/properties" variant="text">
                Explore properties
              </Button>
            </div>
          </div>

          <div className="home-hero__media">
            <MediaPlaceholder label="HOME HERO VIDEO" ratio="hero" tone="violet" />
            <div className="home-hero__media-note">
              <span aria-hidden="true">↳</span>
              <p>Reserved for supplied RC Premier Properties media.</p>
            </div>
          </div>

          <form className="property-search-entry" action="/properties" method="get">
            <div className="property-search-entry__heading">
              <p className="eyebrow">Find a property</p>
              <p>Start with what matters to you.</p>
            </div>

            <div className="form-field">
              <label htmlFor="home-property-id">Property ID</label>
              <input
                id="home-property-id"
                name="propertyId"
                type="search"
                placeholder="Enter an ID"
                maxLength={40}
              />
            </div>

            <div className="form-field">
              <label htmlFor="home-location">Location</label>
              <input
                id="home-location"
                name="location"
                type="search"
                placeholder="City or area"
              />
            </div>

            <div className="form-field">
              <label htmlFor="home-property-type">Property type</label>
              <select id="home-property-type" name="propertyType" defaultValue="">
                <option value="">All types</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PROPERTY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field form-field--price">
              <label htmlFor="home-min-price">Minimum price</label>
              <input
                id="home-min-price"
                name="minPrice"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="₱ Min"
              />
            </div>

            <div className="form-field form-field--price">
              <label htmlFor="home-max-price">Maximum price</label>
              <input
                id="home-max-price"
                name="maxPrice"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="₱ Max"
              />
            </div>

            <Button type="submit" className="property-search-entry__submit">
              Search properties
            </Button>
          </form>
        </Container>
      </Section>

      <Section aria-labelledby="featured-heading">
        <Container>
          <SectionHeading
            number="002"
            eyebrow="Featured properties"
            title={
              <span id="featured-heading">
                A focused edit,
                <br />
                when listings are ready.
              </span>
            }
            intro="Published featured properties will be drawn from the live catalogue. This space deliberately does not use sample listings."
          />
          <Suspense fallback={<FeaturedPropertiesFallback />}>
            <FeaturedProperties />
          </Suspense>
        </Container>
      </Section>

      <Section tone="dark" aria-labelledby="categories-heading">
        <Container>
          <SectionHeading
            number="003"
            eyebrow="Property types"
            title={
              <span id="categories-heading">
                Different needs.
                <br />
                One clear place to begin.
              </span>
            }
            intro="Browse the main property categories and refine your search on the listings page."
          />

          <div className="category-grid">
            {propertyCategories.map((category, index) => (
              <Link
                key={category.type}
                href={`/properties?propertyType=${category.type}`}
                className="category-card"
              >
                <span className="category-card__number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                </div>
                <span className="category-card__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="location-heading">
        <Container>
          <SectionHeading
            number="004"
            eyebrow="Location focus"
            title={
              <span id="location-heading">
                Rooted in Angeles City,
                <br />
                open to wider Pampanga.
              </span>
            }
            intro="Use location search to explore published properties across the project’s primary geographic area."
          />

          <div className="location-composition">
            <MediaPlaceholder
              label="PAMPANGA LOCATION IMAGE"
              ratio="landscape"
              tone="neutral"
            />
            <div className="location-composition__aside">
              <p className="eyebrow">Search areas</p>
              <ul>
                <li>
                  <Link href="/properties?location=Angeles+City">
                    <span>Angeles City</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/properties?location=Clark">
                    <span>Clark area</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/properties?location=Pampanga">
                    <span>Wider Pampanga</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="soft" aria-labelledby="approach-heading">
        <Container>
          <SectionHeading
            number="005"
            eyebrow="A calmer search"
            title={
              <span id="approach-heading">
                Clarity at each
                <br />
                step of the journey.
              </span>
            }
            intro="The experience is structured to help you move from broad possibilities to a practical next step."
          />

          <ol className="approach-list">
            {approach.map((item) => (
              <li key={item.number}>
                <span className="approach-list__number" aria-hidden="true">
                  {item.number}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section className="next-step-section" aria-labelledby="next-step-heading">
        <Container>
          <SectionHeading
            number="006"
            eyebrow="Continue the conversation"
            title={
              <span id="next-step-heading">
                Your property plans,
                <br />
                your next step.
              </span>
            }
          />

          <div className="next-step-grid">
            <article className="next-step-card next-step-card--gold">
              <p className="eyebrow">For property owners</p>
              <h3>Thinking of selling a property?</h3>
              <p>Share the essentials and begin a direct property conversation.</p>
              <Button href="/sell" variant="outline">
                Sell your property
              </Button>
            </article>

            <article className="next-step-card next-step-card--violet">
              <p className="eyebrow">For buyers and renters</p>
              <h3>Ready to see a property more closely?</h3>
              <p>
                Start a viewing request from a listing or discuss what you are looking
                for.
              </p>
              <div className="next-step-card__actions">
                <Button href="/book-viewing" variant="secondary">
                  Book a viewing
                </Button>
                <Button href="/contact" variant="text">
                  Contact us
                </Button>
              </div>
            </article>
          </div>
        </Container>
      </Section>
    </main>
  );
}
