import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import propertiesImage from "@/assets/site/properties.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import {
  PropertyTourContext,
  RequestTourButton,
} from "@/features/inquiries/RequestTourProvider";
import { PropertyActions } from "@/features/properties/PropertyActions";
import { PropertyCard } from "@/features/properties/PropertyCard";
import { PropertyGallery } from "@/features/properties/PropertyGallery";
import { PropertyLocationMap } from "@/features/properties/PropertyLocationMap";
import {
  formatLocation,
  formatPrice,
  propertyTypeLabel,
  visibleSpecifications,
} from "@/features/properties/property-format";
import {
  getPropertyBySlug,
  getRelatedProperties,
} from "@/features/properties/property.service";
import {
  buildPropertyMetadata,
  buildPropertyStructuredData,
  nonpublicPropertyMetadata,
} from "@/features/properties/property-seo";
import styles from "@/features/properties/property-detail.module.css";
import { formatBusinessDate } from "@/lib/date-time";
import { OFFICIAL_EMAIL, OFFICIAL_PHONE } from "@/lib/public-contact";
import { absoluteSiteUrl, serializeJsonLd } from "@/lib/seo";
import { ApiClientError } from "@/services/api-client";

const getPublishedProperty = cache(getPropertyBySlug);
const LOCATION_RESULTS_HREF =
  /^\/locations\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\?[A-Za-z0-9%+_.~=&-]*)?$/;

function safeResultsHref(value: string | undefined): string {
  if (!value) return "/properties";
  if (value === "/properties" || value.startsWith("/properties?")) return value;
  return LOCATION_RESULTS_HREF.test(value) ? value : "/properties";
}

async function RelatedProperties({ slug }: { slug: string }) {
  const related = await getRelatedProperties(slug).catch(() => ({ items: [] }));
  if (related.items.length === 0) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="related-title">
      <Container>
        <div className={styles.relatedHeading}>
          <div>
            <p className={styles.sectionLabel}>More published inventory</p>
            <h2 id="related-title">Similar properties</h2>
          </div>
          <Button href="/properties" variant="outline">
            Browse all properties
          </Button>
        </div>
        <div className={styles.relatedGrid}>
          {related.items.map((item) => (
            <PropertyCard key={item.id} property={item} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  try {
    const property = await getPublishedProperty(slug);
    return buildPropertyMetadata(property, propertiesImage.src);
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      (error.statusCode === 400 || error.statusCode === 404)
    ) {
      notFound();
    }
    return nonpublicPropertyMetadata();
  }
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: PageProps<"/properties/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const rawFrom = Array.isArray(query.from) ? query.from[0] : query.from;
  const resultsHref = safeResultsHref(rawFrom);
  let property;

  try {
    property = await getPublishedProperty(slug);
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      (error.statusCode === 400 || error.statusCode === 404)
    ) {
      notFound();
    }
    throw error;
  }

  const location = formatLocation(property.location);
  const specifications = visibleSpecifications(property.specifications);
  const structuredData = buildPropertyStructuredData(property);
  const publicUrl =
    absoluteSiteUrl(`/properties/${property.slug}`) ?? `/properties/${property.slug}`;

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <PropertyTourContext
        property={{
          propertyId: property.propertyId,
          title: property.title,
          availability: property.availability,
          ...(property.coverMedia ? { media: property.coverMedia } : {}),
        }}
      />
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}

      <section className={styles.printSummary} aria-label="Printable property summary">
        <h1>RC Premier Properties</h1>
        <p>Premier Property #{property.propertyId}</p>
        <p>{property.title}</p>
        <p>Price: {formatPrice(property.price.amount, property.price.currency)}</p>
        <p>{location}</p>
        <p>{propertyTypeLabel(property.propertyType)}</p>
        <dl>
          {specifications.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <p>{property.description}</p>
        <p>
          {OFFICIAL_EMAIL} · {OFFICIAL_PHONE}
        </p>
        <p>Public listing: {publicUrl}</p>
      </section>

      <section className={styles.identity} aria-labelledby="property-title">
        <Container>
          <div className={styles.detailNavigation}>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/properties">Properties</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Premier Property #{property.propertyId}</span>
            </nav>
            <Link href={resultsHref} className={styles.backToResults}>
              ← Back to Results
            </Link>
          </div>

          <PropertyGallery
            coverMedia={property.coverMedia}
            gallery={property.gallery}
            propertyIdentifier={property.id}
          />

          <div className={styles.identityGrid}>
            <div>
              <div className={styles.metaRow}>
                <p className={styles.meta}>
                  {propertyTypeLabel(property.propertyType)} · For {property.purpose} ·
                  Premier Property #{property.propertyId}
                </p>
                <span className={styles.availabilityBadge}>
                  {property.availability}
                </span>
              </div>
              <h1 id="property-title" className={styles.title}>
                {property.title}
              </h1>
              <p className={styles.location}>{location}</p>
            </div>
            <div className={styles.priceBlock}>
              <p className={styles.priceLabel}>Asking price</p>
              <p className={styles.price}>
                {formatPrice(property.price.amount, property.price.currency)}
              </p>
              {property.price.negotiable ? (
                <p className={styles.negotiable}>Negotiable</p>
              ) : null}
            </div>
          </div>

          <div className={styles.summaryBar}>
            <dl className={styles.quickFacts}>
              {specifications.slice(0, 4).map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
              <div>
                <dt>Availability</dt>
                <dd>{property.availability}</dd>
              </div>
            </dl>
            <PropertyActions
              propertyNumber={`PREMIER PROPERTY #${property.propertyId}`}
              shareTitle={property.title}
              shareUrl={publicUrl}
            />
          </div>
        </Container>
      </section>

      <section className={styles.contentSection}>
        <Container className={styles.contentGrid}>
          <div className={styles.mainContent}>
            <section className={styles.sectionBlock}>
              <p className={styles.sectionLabel}>Overview</p>
              <h2>A closer look</h2>
              <p className={styles.description}>{property.description}</p>
            </section>

            <section className={styles.sectionBlock}>
              <p className={styles.sectionLabel}>Property details</p>
              <h2>Property at a glance</h2>
              <dl className={styles.specGrid}>
                {specifications.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
                <div>
                  <dt>Availability</dt>
                  <dd>{property.availability}</dd>
                </div>
                <div>
                  <dt>Listing purpose</dt>
                  <dd>For {property.purpose}</dd>
                </div>
              </dl>
            </section>

            {property.highlights.length > 0 ||
            property.amenities.length > 0 ||
            property.features.length > 0 ? (
              <section className={styles.sectionBlock}>
                <p className={styles.sectionLabel}>Highlights and features</p>
                <h2>What the listing includes</h2>
                <div className={styles.listColumns}>
                  {[...property.highlights, ...property.amenities, ...property.features]
                    .filter((item, index, items) => items.indexOf(item) === index)
                    .reduce<string[][]>(
                      (columns, item, index) => {
                        columns[index % 2]?.push(item);
                        return columns;
                      },
                      [[], []],
                    )
                    .map((column, index) => (
                      <ul key={index} className={styles.featureList}>
                        {column.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ))}
                </div>
              </section>
            ) : null}

            <section className={styles.sectionBlock}>
              <p className={styles.sectionLabel}>Location</p>
              <h2>{location}</h2>
              <div className={styles.mapBlock}>
                {property.location.publicPoint ? (
                  <PropertyLocationMap property={property} />
                ) : (
                  <MediaPlaceholder label="PROPERTY MAP / GENERAL AREA" ratio="map" />
                )}
                <p className={styles.privacyNote}>
                  {property.location.disclosure === "exact"
                    ? "This listing is configured to show its exact public location."
                    : "Approximate location shown for privacy. Exact viewing details will be coordinated after your appointment is confirmed."}
                </p>
              </div>
            </section>
          </div>

          <aside className={styles.aside} aria-label="Property inquiry">
            <p className={styles.asideLabel}>Property guidance</p>
            <h2>Ask about this property.</h2>
            <p className={styles.asideCopy}>
              Include the Premier Property number so the team can respond with the right
              listing context.
            </p>
            <div className={styles.asideActions}>
              {property.availability !== "sold" ? (
                <RequestTourButton
                  variant="secondary"
                  property={{
                    propertyId: property.propertyId,
                    title: property.title,
                    ...(property.coverMedia ? { media: property.coverMedia } : {}),
                  }}
                />
              ) : null}
              <Button
                href={`/contact?propertyId=${encodeURIComponent(property.propertyId)}`}
                variant="outline"
              >
                Send an inquiry
              </Button>
            </div>
            <p className={styles.updatedAt}>
              Last updated{" "}
              <time dateTime={property.updatedAt}>
                {formatBusinessDate(property.updatedAt)}
              </time>{" "}
              (Philippine time)
            </p>
          </aside>
        </Container>
      </section>

      <div className={styles.mobileActions} aria-label="Property actions">
        <Button
          href={`/contact?propertyId=${encodeURIComponent(property.propertyId)}`}
          variant="outline"
        >
          Inquire
        </Button>
        {property.availability !== "sold" ? (
          <RequestTourButton
            variant="secondary"
            property={{
              propertyId: property.propertyId,
              title: property.title,
              ...(property.coverMedia ? { media: property.coverMedia } : {}),
            }}
          />
        ) : null}
      </div>

      <Suspense fallback={null}>
        <RelatedProperties slug={slug} />
      </Suspense>
    </main>
  );
}
