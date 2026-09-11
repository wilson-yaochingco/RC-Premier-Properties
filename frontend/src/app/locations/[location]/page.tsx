import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { PropertyFacetsResponse, PropertySearchResponse } from "@rc/shared";
import locationImage from "@/assets/site/location.png";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocationEditorial } from "@/features/locations/LocationEditorial";
import { LocationInventoryMap } from "@/features/locations/LocationInventoryMap";
import { getLocationEditorialContent } from "@/features/locations/location-content";
import {
  buildLocationMetadata,
  buildLocationStructuredData,
  nonpublicLocationMetadata,
} from "@/features/locations/location-seo";
import styles from "@/features/locations/locations.module.css";
import { PropertyCard } from "@/features/properties/PropertyCard";
import { PropertyFilterChips } from "@/features/properties/PropertyFilterChips";
import { PropertyPagination } from "@/features/properties/PropertyPagination";
import { PropertySearchForm } from "@/features/properties/PropertySearchForm";
import {
  paginationHref,
  propertyApiSearchParams,
  propertyFormValues,
  propertyMapApiSearchParams,
  type RawSearchParams,
} from "@/features/properties/property-query";
import {
  getProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import propertyStyles from "@/features/properties/properties.module.css";
import {
  findPublicLocationBySlug,
  publicLocationPath,
  shortPublicLocation,
} from "@/lib/public-location";
import { serializeJsonLd } from "@/lib/seo";
import { ApiClientError } from "@/services/api-client";

export const dynamic = "force-dynamic";

const getCachedFacets = cache(getPropertyFacets);

function hasQueryValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value)
    ? value.some((item) => item.trim() !== "")
    : Boolean(value?.trim());
}

function isStableLocationState(searchParams: RawSearchParams): boolean {
  return Object.entries(searchParams)
    .filter(([, value]) => hasQueryValue(value))
    .every(([key, value]) => {
      if (Array.isArray(value) && value.length !== 1) return false;
      const first = Array.isArray(value) ? value[0] : value;
      return (
        (key === "purpose" && first === "sale") ||
        (key === "sort" && first === "newest") ||
        (key === "page" && first === "1")
      );
    });
}

function locationResultsHref(
  locationPath: string,
  searchParams: RawSearchParams,
): string {
  const query = propertyApiSearchParams(searchParams);
  query.delete("location");
  query.delete("limit");
  if (query.get("purpose") === "sale") query.delete("purpose");
  if (query.get("sort") === "newest") query.delete("sort");
  if (query.get("page") === "1") query.delete("page");
  return `${locationPath}${query.size ? `?${query.toString()}` : ""}`;
}

async function loadFacets(): Promise<PropertyFacetsResponse | undefined> {
  try {
    return await getCachedFacets();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/locations/[location]">): Promise<Metadata> {
  const [{ location: slug }, rawSearchParams, facets] = await Promise.all([
    params,
    searchParams as Promise<RawSearchParams>,
    loadFacets(),
  ]);
  const match = findPublicLocationBySlug(slug, facets?.locationCounts ?? []);
  if (!match) return nonpublicLocationMetadata();
  const editorial = getLocationEditorialContent(match.location);

  return buildLocationMetadata({
    location: match.location,
    count: match.count,
    imagePath: editorial?.scenery.imagePath ?? locationImage.src,
    noIndex: !isStableLocationState(rawSearchParams),
  });
}

export default async function LocationDetailPage({
  params,
  searchParams,
}: PageProps<"/locations/[location]">) {
  const [{ location: slug }, rawSearchParams, facets] = await Promise.all([
    params,
    searchParams as Promise<RawSearchParams>,
    loadFacets(),
  ]);

  if (!facets) {
    return (
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <Container className={styles.intro}>
          <EmptyState
            eyebrow="Location interruption"
            title="This location is temporarily unavailable."
            description="The bounded property-location index could not be reached. No location content has been substituted."
            actionLabel="Browse properties"
            actionHref="/properties"
            headingLevel="h1"
          />
        </Container>
      </main>
    );
  }

  const locationFacet = findPublicLocationBySlug(slug, facets.locationCounts ?? []);
  if (!locationFacet) notFound();

  const locationName = shortPublicLocation(locationFacet.location);
  const editorial = getLocationEditorialContent(locationFacet.location);
  const canonicalPath = publicLocationPath(locationFacet.location);
  const values = propertyFormValues(rawSearchParams);
  const requestParams: RawSearchParams = {
    ...rawSearchParams,
    location: locationName,
  };
  const resultsHref = locationResultsHref(canonicalPath, rawSearchParams);
  const mapQuery = propertyMapApiSearchParams(requestParams).toString();
  let response: PropertySearchResponse | undefined;
  let errorMessage: string | undefined;

  try {
    response = await getProperties(requestParams);
  } catch (error) {
    errorMessage =
      error instanceof ApiClientError
        ? error.message
        : "Property results are temporarily unavailable.";
  }

  if (
    response &&
    response.pagination.total > 0 &&
    response.items.length === 0 &&
    response.pagination.totalPages > 0 &&
    Number(values.page) > response.pagination.totalPages
  ) {
    redirect(
      paginationHref(
        rawSearchParams,
        response.pagination.totalPages,
        canonicalPath,
        true,
      ),
    );
  }

  const structuredData = buildLocationStructuredData(locationFacet.location);

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}

      <section className={styles.detailHero} aria-labelledby="location-title">
        <Container className={styles.guideContainer}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/locations">Locations</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{locationName}</span>
          </nav>
          <div className={styles.detailHeroGrid}>
            <figure className={styles.detailMedia}>
              <Image
                src={locationImage}
                alt="Contemporary multi-storey residence under a blue sky"
                fill
                preload
                sizes="(max-width: 1023px) 100vw, 70vw"
              />
            </figure>
            <div className={styles.detailTitle}>
              <p>Pampanga location guide</p>
              <h1 id="location-title">{locationName}</h1>
              <p>
                Explore current residential properties for sale represented by published
                RC Premier Properties inventory.
              </p>
            </div>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Published inventory</dt>
              <dd>
                {locationFacet.count.toLocaleString("en-PH")}{" "}
                {locationFacet.count === 1 ? "property" : "properties"}
              </dd>
            </div>
            <div>
              <dt>Market</dt>
              <dd>Residential sale</dd>
            </div>
            <div>
              <dt>Public area</dt>
              <dd>{locationFacet.location}</dd>
            </div>
          </dl>
        </Container>
      </section>

      <section className={styles.detailIntro} aria-labelledby="location-overview-title">
        <Container className={`${styles.guideContainer} ${styles.detailIntroGrid}`}>
          <p>Location overview</p>
          <div>
            <h2 id="location-overview-title">A factual view of current inventory.</h2>
            <p>
              This guide is intentionally based on published property records. Listing
              details, approved public map points, and availability remain the source of
              truth; no popularity ranking or neighborhood claims are added.
            </p>
          </div>
        </Container>
      </section>

      {editorial ? (
        <LocationEditorial content={editorial} inventoryCount={locationFacet.count} />
      ) : null}

      <section className={styles.inventory} aria-labelledby="location-inventory-title">
        <Container className={styles.guideContainer}>
          <div className={styles.inventoryHeader}>
            <h2 id="location-inventory-title">Properties in {locationName}</h2>
            <p aria-live="polite">
              {response
                ? `${response.pagination.total.toLocaleString("en-PH")} matching ${response.pagination.total === 1 ? "property" : "properties"}`
                : "Results unavailable"}
            </p>
          </div>

          <div className={styles.inventoryFilters}>
            <PropertySearchForm
              values={values}
              facets={facets}
              action={canonicalPath}
              clearHref={canonicalPath}
              lockedLocation={locationFacet.location}
            />
            <PropertyFilterChips
              values={values}
              searchParams={rawSearchParams}
              basePath={canonicalPath}
              clearHref={canonicalPath}
              omitLocation
            />
          </div>

          {errorMessage ? (
            <div className={propertyStyles.errorState} role="alert">
              <strong>We could not load this location&apos;s properties.</strong>{" "}
              {errorMessage}
              <br />
              Your filters remain in the URL. Try again when the property service is
              reachable.
            </div>
          ) : null}

          {response ? (
            <LocationInventoryMap
              properties={response.items}
              location={locationName}
              mapQuery={mapQuery}
            >
              {response.items.length > 0 ? (
                <>
                  <div
                    className={`${propertyStyles.grid} ${styles.locationPropertyGrid}`}
                  >
                    {response.items.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        resultsHref={resultsHref}
                      />
                    ))}
                  </div>
                  <PropertyPagination
                    pagination={response.pagination}
                    searchParams={rawSearchParams}
                    basePath={canonicalPath}
                    omitLocation
                  />
                </>
              ) : (
                <EmptyState
                  eyebrow="No matching inventory"
                  title="No published properties match these filters."
                  description={`Adjust the filters or view all published properties in ${locationName}.`}
                  actionLabel="Clear filters"
                  actionHref={canonicalPath}
                />
              )}
            </LocationInventoryMap>
          ) : null}
        </Container>
      </section>
    </main>
  );
}
