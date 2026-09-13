import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { PropertyFacetsResponse, PropertySearchResponse } from "@rc/shared";
import propertiesImage from "@/assets/site/properties.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiClientError } from "@/services/api-client";
import { PropertyCard } from "@/features/properties/PropertyCard";
import { PropertyFilterChips } from "@/features/properties/PropertyFilterChips";
import { PropertyPagination } from "@/features/properties/PropertyPagination";
import { PropertyResultsExperience } from "@/features/properties/PropertyResultsExperience";
import { PropertySearchForm } from "@/features/properties/PropertySearchForm";
import {
  paginationHref,
  propertyFormValues,
  type RawSearchParams,
} from "@/features/properties/property-query";
import {
  getProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import {
  buildPropertiesMetadata,
  resolveLocationSeoState,
} from "@/features/properties/property-seo";
import styles from "@/features/properties/properties.module.css";

const getCachedPropertyFacets = cache(getPropertyFacets);

export async function generateMetadata({
  searchParams,
}: PageProps<"/properties">): Promise<Metadata> {
  const rawSearchParams = (await searchParams) as RawSearchParams;
  const hasLocation = Boolean(propertyFormValues(rawSearchParams).location);
  const facets = hasLocation ? await loadFacets() : undefined;
  return buildPropertiesMetadata(
    resolveLocationSeoState(rawSearchParams, facets),
    propertiesImage.src,
  );
}

async function loadFacets(): Promise<PropertyFacetsResponse | undefined> {
  try {
    return await getCachedPropertyFacets();
  } catch {
    return undefined;
  }
}

export default async function PropertiesPage({
  searchParams,
}: PageProps<"/properties">) {
  const rawSearchParams = (await searchParams) as RawSearchParams;
  const resultQuery = new URLSearchParams();
  Object.entries(rawSearchParams).forEach(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) resultQuery.set(key, first);
  });
  const resultsHref = `/properties${resultQuery.size ? `?${resultQuery.toString()}` : ""}`;
  const values = propertyFormValues(rawSearchParams);
  const facetsPromise = loadFacets();
  let response: PropertySearchResponse | undefined;
  let errorMessage: string | undefined;

  try {
    response = await getProperties(rawSearchParams);
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
    redirect(paginationHref(rawSearchParams, response.pagination.totalPages));
  }

  const facets = await facetsPromise;
  const locationSeo = resolveLocationSeoState(rawSearchParams, facets);

  return (
    <main id="main-content" tabIndex={-1} className={styles.catalogPage}>
      <section className={styles.hero}>
        <Container className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>Residential properties for sale</p>
          <h1>
            {locationSeo.location
              ? `Properties for sale in ${locationSeo.location}`
              : "Properties for sale in Pampanga"}
          </h1>
          {locationSeo.location ? (
            <p className={styles.heroIntro}>
              {locationSeo.count?.toLocaleString("en-PH")} published{" "}
              {locationSeo.count === 1 ? "property is" : "properties are"} currently
              available to explore in this location.
            </p>
          ) : null}
          {!locationSeo.location ? (
            <p className={styles.heroIntro}>
              Search current published inventory by Premier Property number, location,
              type, specifications, and budget.
            </p>
          ) : null}
        </Container>
      </section>

      <Container className={styles.searchWrap}>
        <PropertySearchForm values={values} facets={facets} />
        <PropertyFilterChips values={values} searchParams={rawSearchParams} />
      </Container>

      <section
        className={styles.resultsSection}
        aria-labelledby="property-results-title"
      >
        <Container className={styles.catalogContainer}>
          <div className={styles.resultsHeader}>
            <h2 id="property-results-title">Available properties</h2>
            <p className={styles.resultCount} aria-live="polite">
              {response
                ? `${response.pagination.total.toLocaleString("en-PH")} result${response.pagination.total === 1 ? "" : "s"}`
                : "Results unavailable"}
            </p>
          </div>

          {errorMessage ? (
            <div className={styles.errorState} role="alert">
              <strong>We could not load the property catalog.</strong> {errorMessage}
              <br />
              Your filters remain in the URL. Check that the Express API and MongoDB are
              available, then try again.
              <Button href={resultsHref} variant="outline">
                Retry property search
              </Button>
            </div>
          ) : null}

          {response ? (
            <PropertyResultsExperience
              properties={response.items}
              selectedLocation={values.location}
              total={response.pagination.total}
            >
              {response.items.length > 0 ? (
                <>
                  <div className={styles.grid}>
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
                  />
                </>
              ) : (
                <EmptyState
                  eyebrow="No matching inventory"
                  title="No published properties match these filters."
                  description="Choose another map area, adjust one or more filters, or clear the search to see the full published collection."
                  actionLabel="Clear all filters"
                  actionHref="/properties"
                />
              )}
            </PropertyResultsExperience>
          ) : null}

          {!response && !errorMessage ? (
            <EmptyState
              title="The catalog is being prepared."
              description="Published properties will appear here when they are available."
            />
          ) : null}
        </Container>
      </section>
    </main>
  );
}
