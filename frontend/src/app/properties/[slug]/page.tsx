import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense, type ReactElement } from "react";
import propertiesImage from "@/assets/site/properties.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  PropertyTourContext,
  RequestTourButton,
} from "@/features/inquiries/RequestTourProvider";
import { PropertyGallery } from "@/features/properties/PropertyGallery";
import {
  balanceColumns,
  groupFeatures,
} from "@/features/properties/property-feature-groups";
import { ShareButton } from "@/features/properties/ShareButton";
import {
  ArrowLeftIcon,
  BathIcon,
  BedIcon,
  CarIcon,
  CheckIcon,
  BuildingIcon,
  FloorAreaIcon,
  LotAreaIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
} from "@/features/properties/PropertyIcons";
import { PropertyLocationMap } from "@/features/properties/PropertyLocationMap";
import { RelatedPropertyCard } from "@/features/properties/RelatedPropertyCard";
import {
  formatLocation,
  formatPrice,
  keyFacts as buildKeyFacts,
  propertyTypeLabel,
  visibleSpecifications,
  type KeyFactKind,
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
import { accent } from "@/lib/accent";
import { OFFICIAL_EMAIL, OFFICIAL_PHONE } from "@/lib/public-contact";
import { PUBLIC_AGENT } from "@/lib/public-agent";
import { absoluteSiteUrl, serializeJsonLd } from "@/lib/seo";
import { ApiClientError } from "@/services/api-client";
import { PageMotion } from "@/components/layout/PageMotion";

const getPublishedProperty = cache(getPropertyBySlug);

const FURNISHED = /furnish|furniture/i;

const FACT_ICONS: Record<KeyFactKind, () => ReactElement> = {
  bedrooms: BedIcon,
  bathrooms: BathIcon,
  parking: CarIcon,
  floorArea: FloorAreaIcon,
  lotArea: LotAreaIcon,
};
const LOCATION_RESULTS_HREF =
  /^\/locations\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\?[A-Za-z0-9%+_.~=&-]*)?$/;

function safeResultsHref(value: string | undefined): string {
  if (!value) return "/properties";
  if (value === "/properties" || value.startsWith("/properties?")) return value;
  return LOCATION_RESULTS_HREF.test(value) ? value : "/properties";
}

/** Each list keeps only items not already shown by an earlier one (case-insensitive). */
function distinctLists(...lists: string[][]): string[][] {
  const seen = new Set<string>();
  return lists.map((list) =>
    list.filter((item) => {
      const key = item.trim().toLocaleLowerCase("en-US");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

async function RelatedProperties({ slug }: { slug: string }) {
  const related = await getRelatedProperties(slug).catch(() => ({ items: [] }));
  if (related.items.length === 0) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="related-title">
      <Container className={styles.shell}>
        <div className={styles.relatedHeading}>
          <h2 id="related-title">{accent("Similar *properties*")}</h2>
          <Button href="/properties" variant="primary" className={styles.relatedCta}>
            Browse all properties
          </Button>
        </div>
        <div className={styles.relatedGrid}>
          {related.items.map((item) => (
            <RelatedPropertyCard key={item.id} property={item} />
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
  const facts = buildKeyFacts(property.specifications);
  const [highlights = [], amenities = [], features = []] = distinctLists(
    property.highlights,
    property.amenities,
    property.features,
  );
  const details: Array<{ label: string; value: string; capitalize?: boolean }> = [
    { label: "Property type", value: propertyTypeLabel(property.propertyType) },
    { label: "Availability", value: property.availability, capitalize: true },
    ...(property.specifications.powderRooms !== undefined
      ? [{ label: "Powder room", value: String(property.specifications.powderRooms) }]
      : []),
    ...(property.specifications.storeys !== undefined
      ? [{ label: "Floors", value: String(property.specifications.storeys) }]
      : []),
  ];
  // Furnishing is a feature, not a structural detail. It is added only when the listing's own
  // feature lists do not already say so.
  const furnishing = property.specifications.furnishing;
  const furnishingFeature =
    furnishing && ![...amenities, ...features].some((item) => FURNISHED.test(item))
      ? [furnishing]
      : [];
  const featureColumns = balanceColumns(
    groupFeatures([...amenities, ...features, ...furnishingFeature]),
  );
  const tourProperty = {
    propertyId: property.propertyId,
    title: property.title,
    availability: property.availability,
    ...(property.coverMedia ? { media: property.coverMedia } : {}),
  };
  const structuredData = buildPropertyStructuredData(property);
  const publicUrl =
    absoluteSiteUrl(`/properties/${property.slug}`) ?? `/properties/${property.slug}`;

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <PageMotion />
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
        <p className={styles.printBrand}>RC Premier Properties</p>
        <p>Property {property.propertyId.replace("PREMIER_PROPERTY_", "#")}</p>
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
        <Container className={styles.shell}>
          <div className={styles.detailNavigation} data-enter>
            <Link href={resultsHref} className={styles.backToResults}>
              <ArrowLeftIcon />
              <span className="link-underline">Back to Results</span>
            </Link>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/">
                    <span className="link-underline">Home</span>
                  </Link>
                </li>
                <li>
                  <Link href="/properties">
                    <span className="link-underline">Properties</span>
                  </Link>
                </li>
                <li aria-current="page" title={property.title}>
                  {property.title}
                </li>
              </ol>
            </nav>
          </div>

          <div data-enter="image" data-enter-delay="1">
            <PropertyGallery
              coverMedia={property.coverMedia}
              gallery={property.gallery}
              propertyIdentifier={property.id}
              title={property.title}
              share={{ title: property.title, url: publicUrl }}
              tour={tourProperty}
            />
          </div>

          <div className={styles.summary}>
            <div className={styles.titleBlock} data-enter data-enter-delay="2">
              <h1 id="property-title" className={styles.title}>
                {property.title}
              </h1>
              <p className={styles.location}>
                <PinIcon />
                {location}
              </p>
            </div>
            <div className={styles.priceBlock} data-enter data-enter-delay="3">
              <p className={styles.priceLabel}>Selling price</p>
              <p className={styles.price}>
                {formatPrice(property.price.amount, property.price.currency)}
              </p>
              {property.price.negotiable ? (
                <p className={styles.negotiable}>Negotiable</p>
              ) : null}
            </div>
            {facts.length > 0 ? (
              <ul className={styles.facts} aria-label="Key specifications">
                {facts.map((fact) => {
                  const FactIcon = FACT_ICONS[fact.kind];
                  return (
                    <li key={fact.kind}>
                      <FactIcon />
                      <span className={styles.factValue}>{fact.value}</span>
                      <span className={styles.factLabel}>{fact.label}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <ShareButton shareTitle={property.title} shareUrl={publicUrl} />
          </div>
        </Container>
      </section>

      <section className={styles.contentSection}>
        <Container className={`${styles.shell} ${styles.contentGrid}`}>
          <div className={styles.mainContent}>
            <section className={styles.sectionBlock} data-motion="fade">
              <h2>{accent("About this *property*")}</h2>
              <div className={styles.description}>
                {property.description
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
              </div>
              {highlights.length > 0 ? (
                <ul className={styles.checkList} aria-label="Highlights">
                  {highlights.map((item) => (
                    <li key={item}>
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className={styles.sectionBlock} data-motion="fade">
              <h2>{accent("Property *details*")}</h2>
              <dl className={styles.details}>
                {details.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd className={item.capitalize ? styles.capitalize : undefined}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {featureColumns[0].length > 0 ? (
              <section className={styles.sectionBlock} data-motion="fade">
                <h2>{accent("Features and *inclusions*")}</h2>
                <div className={styles.featureGroups}>
                  {featureColumns.map((column, index) => (
                    <div key={index} className={styles.featureColumn}>
                      {column.map((group) => (
                        <div key={group.title}>
                          <h3>{group.title}</h3>
                          <ul className={styles.checkList}>
                            {group.items.map((item) => (
                              <li key={item}>
                                <CheckIcon />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {property.location.publicPoint ? (
              <section className={styles.sectionBlock} data-motion="fade">
                <h2>{accent("Map")}</h2>
                <div className={styles.mapBlock}>
                  <PropertyLocationMap property={property} />
                  <p className={styles.privacyNote}>
                    {property.location.disclosure === "exact"
                      ? "This listing is configured to show its exact public location."
                      : "Approximate location shown for privacy. Exact viewing details will be coordinated after your appointment is confirmed."}
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.aside} aria-label="Property inquiry">
            <p className={styles.asideLabel}>Contact agent</p>
            <div className={styles.agent}>
              <span className={styles.agentAvatar} aria-hidden="true">
                {PUBLIC_AGENT.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- supplied agent photo
                  <img src={PUBLIC_AGENT.photoUrl} alt="" />
                ) : (
                  <BuildingIcon />
                )}
              </span>
              <div>
                <p className={styles.agentName}>{PUBLIC_AGENT.name}</p>
                <p className={styles.agentRole}>{PUBLIC_AGENT.role}</p>
              </div>
            </div>
            <ul className={styles.asideContact}>
              <li>
                <PhoneIcon />
                <a href={PUBLIC_AGENT.phoneHref}>
                  <span className="link-underline">{PUBLIC_AGENT.phone}</span>
                </a>
              </li>
              <li>
                <MailIcon />
                <a href={`mailto:${PUBLIC_AGENT.email}`}>
                  <span className="link-underline">{PUBLIC_AGENT.email}</span>
                </a>
              </li>
            </ul>
            <div className={styles.asideActions}>
              {property.availability !== "sold" ? (
                <RequestTourButton variant="primary" property={tourProperty} iconless>
                  Book a Viewing
                </RequestTourButton>
              ) : null}
              <Button
                href={`/contact?propertyId=${encodeURIComponent(property.propertyId)}`}
                variant="outline"
                iconless
              >
                Inquire about this property
              </Button>
            </div>
          </aside>
        </Container>
      </section>

      <Suspense fallback={null}>
        <RelatedProperties slug={slug} />
      </Suspense>
    </main>
  );
}
