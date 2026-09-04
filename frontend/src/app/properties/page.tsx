import type { Metadata } from "next";
import type { PropertyFacetsResponse, PropertySearchResponse } from "@rc/shared";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiClientError } from "@/services/api-client";
import { PropertyCard } from "@/features/properties/PropertyCard";
import { PropertyPagination } from "@/features/properties/PropertyPagination";
import { PropertyResultsExperience } from "@/features/properties/PropertyResultsExperience";
import { PropertySearchForm } from "@/features/properties/PropertySearchForm";
import {
  propertyFormValues,
  type RawSearchParams,
} from "@/features/properties/property-query";
import {
  getProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import styles from "@/features/properties/properties.module.css";

export const metadata: Metadata = {
  title: "Properties",
  description:
    "Search published RC Premier Properties listings by Property ID, Pampanga location, property type and price.",
  alternates: { canonical: "/properties" },
  openGraph: {
    title: "Properties | RC Premier Properties",
    description:
      "Search published property listings in Angeles City and the wider Pampanga market.",
    type: "website",
  },
};

async function loadFacets(): Promise<PropertyFacetsResponse | undefined> {
  try {
    return await getPropertyFacets();
  } catch {
    return undefined;
  }
}

export default async function PropertiesPage({
  searchParams,
}: PageProps<"/properties">) {
  const rawSearchParams = (await searchParams) as RawSearchParams;
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

  const facets = await facetsPromise;

  return (
    <main id="main-content" tabIndex={-1}>
      <section className={styles.hero}>
        <Container className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>Property collection · Pampanga</p>
          <h1>Find the right place, with clarity.</h1>
          <p className={styles.heroIntro}>
            Search published inventory by reference, location, type and budget. Every
            result comes from the property API—never from a decorative sample list.
          </p>
        </Container>
      </section>

      <Container className={styles.searchWrap}>
        <PropertySearchForm values={values} facets={facets} />
      </Container>

      <section
        className={styles.resultsSection}
        aria-labelledby="property-results-title"
      >
        <Container>
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
              <strong>We could not load the property catalogue.</strong> {errorMessage}
              <br />
              Your filters remain in the URL. Check that the Express API and MongoDB are
              available, then try again.
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
                      <PropertyCard key={property.id} property={property} />
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
              title="The catalogue is being prepared."
              description="Published properties will appear here when inventory is connected."
            />
          ) : null}
        </Container>
      </section>
    </main>
  );
}
