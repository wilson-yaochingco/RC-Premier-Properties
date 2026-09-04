import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { ApiClientError } from "@/services/api-client";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import { PropertyLocationMap } from "@/features/properties/PropertyLocationMap";
import {
  formatLocation,
  formatPrice,
  propertyTypeLabel,
  visibleSpecifications,
} from "@/features/properties/property-format";
import { getPropertyBySlug } from "@/features/properties/property.service";
import { SITE_URL } from "@/lib/env";
import styles from "@/features/properties/property-detail.module.css";

export async function generateMetadata({
  params,
}: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  try {
    const property = await getPropertyBySlug(slug);
    const description = property.shortDescription.slice(0, 160);
    return {
      title: property.title,
      description,
      alternates: { canonical: `/properties/${property.slug}` },
      openGraph: {
        title: property.title,
        description,
        type: "website",
        url: `/properties/${property.slug}`,
      },
    };
  } catch {
    return {
      title: "Property",
      description: "View a published RC Premier Properties listing.",
    };
  }
}

export default async function PropertyDetailPage({
  params,
}: PageProps<"/properties/[slug]">) {
  const { slug } = await params;
  let property;

  try {
    property = await getPropertyBySlug(slug);
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
  const gallery = property.gallery.slice(0, 3);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.title,
    description: property.shortDescription,
    sku: property.propertyId,
    category: propertyTypeLabel(property.propertyType),
    url: `${SITE_URL}/properties/${property.slug}`,
    areaServed: {
      "@type": "AdministrativeArea",
      name: location,
    },
    offers: {
      "@type": "Offer",
      price: property.price.amount,
      priceCurrency: property.price.currency,
      availability:
        property.availability === "available"
          ? "https://schema.org/InStock"
          : property.availability === "reserved"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/properties/${property.slug}`,
    },
  };

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />

      <section className={styles.identity}>
        <Container>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/properties">Properties</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{property.propertyId}</span>
          </nav>

          <div className={styles.identityGrid}>
            <div>
              <p className={styles.meta}>
                {propertyTypeLabel(property.propertyType)} · For {property.purpose} · ID{" "}
                {property.propertyId}
              </p>
              <h1 className={styles.title}>{property.title}</h1>
              <p className={styles.location}>{location}</p>
            </div>
            <div className={styles.priceBlock}>
              <p className={styles.priceLabel}>Asking price</p>
              <p className={styles.price}>
                {formatPrice(property.price.amount, property.price.currency)}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <section className={styles.gallery} aria-label="Property gallery">
          <div className={styles.galleryMain}>
            <PropertyMedia
              media={gallery[0] ?? property.coverMedia}
              label="PROPERTY GALLERY IMAGE 01"
              priority
              sizes="(max-width: 768px) 100vw, 72vw"
            />
          </div>
          <div className={styles.gallerySide}>
            <PropertyMedia
              media={gallery[1]}
              label="PROPERTY GALLERY IMAGE 02"
              sizes="28vw"
            />
            <PropertyMedia
              media={gallery[2]}
              label="PROPERTY GALLERY IMAGE 03"
              sizes="28vw"
            />
          </div>
        </section>
      </Container>

      <section className={styles.contentSection}>
        <Container className={styles.contentGrid}>
          <div className={styles.mainContent}>
            <section className={styles.sectionBlock}>
              <p className={styles.sectionLabel}>01 · Overview</p>
              <h2>A closer look</h2>
              <p className={styles.description}>{property.description}</p>
            </section>

            {specifications.length > 0 ? (
              <section className={styles.sectionBlock}>
                <p className={styles.sectionLabel}>02 · Specifications</p>
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
            ) : null}

            {property.highlights.length > 0 ||
            property.amenities.length > 0 ||
            property.features.length > 0 ? (
              <section className={styles.sectionBlock}>
                <p className={styles.sectionLabel}>03 · Details</p>
                <h2>Highlights and features</h2>
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
              <p className={styles.sectionLabel}>04 · Location</p>
              <h2>{location}</h2>
              <div className={styles.mapBlock}>
                {property.location.publicPoint ? (
                  <PropertyLocationMap property={property} />
                ) : (
                  <MediaPlaceholder label="PROPERTY MAP / GENERAL AREA" ratio="map" />
                )}
                <p className={styles.privacyNote}>
                  The map and location text honor this listing&apos;s public precision
                  setting ({property.location.publicPrecision.replace("-", " ")}). An
                  exact stored address or internal coordinate is never sent unless it is
                  separately approved for exact public disclosure.
                </p>
              </div>
            </section>
          </div>

          <aside className={styles.aside} aria-label="Property inquiry">
            <p className={styles.asideLabel}>Property guidance</p>
            <h2>Ask about this property.</h2>
            <p className={styles.asideCopy}>
              Include the Property ID in your message so the team can respond with the
              right listing context.
            </p>
            <div className={styles.asideActions}>
              <Button
                href={`/book-viewing?propertyId=${encodeURIComponent(property.propertyId)}`}
                variant="secondary"
              >
                Request a viewing
              </Button>
              <Button
                href={`/contact?propertyId=${encodeURIComponent(property.propertyId)}`}
                variant="outline"
              >
                Send an inquiry
              </Button>
            </div>
            <div className={styles.agentSlot}>
              <MediaPlaceholder
                label="AGENT PHOTO"
                ratio="square"
                tone="violet"
                className={styles.agentMedia}
              />
              <div>
                <strong>Assigned property specialist</strong>
                <p>A verified public agent profile will appear when supplied.</p>
              </div>
            </div>
          </aside>
        </Container>
      </section>

      <section className={styles.browseCta}>
        <Container className={styles.browseCtaInner}>
          <h2>Keep exploring Pampanga properties.</h2>
          <Button href="/properties" variant="secondary">
            Browse all properties
          </Button>
        </Container>
      </section>
    </main>
  );
}
