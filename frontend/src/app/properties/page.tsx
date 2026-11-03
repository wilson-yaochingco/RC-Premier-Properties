import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { PropertyFacetsResponse } from "@rc/shared";
import propertiesImage from "@/assets/site/properties.png";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { DevHomepagePreview } from "@/features/home/DevHomepagePreview";
import {
  activeCatalogFixture,
  loadCatalogInventory,
  withCatalogFixture,
} from "@/features/properties/catalog-inventory";
import { PropertyCatalogCard } from "@/features/properties/PropertyCatalogCard";
import { PropertyCatalogFilters } from "@/features/properties/PropertyCatalogFilters";
import {
  CatalogActiveFilters,
  CatalogHeading,
  CatalogIntro,
  CatalogSort,
  CatalogInvalidFilters,
  CatalogUnavailable,
  ZeroResults,
} from "@/features/properties/PropertyCatalogSections";
import { PropertyPagination } from "@/features/properties/PropertyPagination";
import {
  paginationHref,
  propertyFormValues,
  type RawSearchParams,
} from "@/features/properties/property-query";
import { getPropertyFacets } from "@/features/properties/property.service";
import {
  buildPropertiesMetadata,
  resolveLocationSeoState,
} from "@/features/properties/property-seo";
import styles from "@/features/properties/property-catalog.module.css";

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
    if (first && key !== "catalogFixture") resultQuery.set(key, first);
  });
  const resultsHref = `/properties${resultQuery.size ? `?${resultQuery.toString()}` : ""}`;
  const values = propertyFormValues(rawSearchParams);
  const fixture = activeCatalogFixture(rawSearchParams.catalogFixture);
  // A fixture supplies its own facets; the live endpoint is never mixed with fixture results.
  const facetsPromise = fixture ? undefined : loadFacets();
  const inventory = await loadCatalogInventory(rawSearchParams, fixture);
  const response = inventory.status === "ready" ? inventory.response : undefined;

  if (
    response &&
    response.pagination.total > 0 &&
    response.items.length === 0 &&
    response.pagination.totalPages > 0 &&
    Number(values.page) > response.pagination.totalPages
  ) {
    redirect(paginationHref(rawSearchParams, response.pagination.totalPages));
  }

  const facets =
    inventory.source === "fixture"
      ? inventory.status === "ready"
        ? inventory.facets
        : undefined
      : await facetsPromise;
  const locationSeo = resolveLocationSeoState(rawSearchParams, facets);

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <CatalogIntro location={locationSeo.location} count={locationSeo.count} />

      <div className={styles.container}>
        <PropertyCatalogFilters values={values} facets={facets} fixture={fixture} />
        <CatalogActiveFilters
          values={values}
          searchParams={rawSearchParams}
          fixture={fixture}
        />
      </div>

      <section className={styles.results} aria-labelledby="property-results-title">
        <div className={styles.container}>
          {response ? (
            <>
              <div className={styles.resultsBar}>
                <CatalogHeading total={response.pagination.total} />
                <CatalogSort
                  current={values.sort}
                  searchParams={rawSearchParams}
                  fixture={fixture}
                />
              </div>
              {response.items.length > 0 ? (
                <>
                  <ul
                    className={styles.grid}
                    data-count={Math.min(response.items.length, 9)}
                    aria-label="Available properties"
                  >
                    {response.items.map((property, index) => (
                      <li key={property.id}>
                        <PropertyCatalogCard
                          property={property}
                          resultsHref={resultsHref}
                          priority={index < 3}
                        />
                      </li>
                    ))}
                  </ul>
                  <PropertyPagination
                    pagination={response.pagination}
                    searchParams={rawSearchParams}
                  />
                </>
              ) : (
                <ZeroResults clearHref={withCatalogFixture("/properties", fixture)} />
              )}
            </>
          ) : (
            <>
              <div className={styles.resultsBar}>
                <CatalogHeading />
              </div>
              {inventory.status === "invalid" ? (
                <CatalogInvalidFilters
                  clearHref={withCatalogFixture("/properties", fixture)}
                />
              ) : (
                <CatalogUnavailable retryHref={resultsHref} />
              )}
            </>
          )}
        </div>
      </section>

      <EditorialCta
        id="properties-cta-heading"
        eyebrow="Still looking?"
        headline={["Let’s find the right", "property for you."]}
        body="Tell us what matters most and RC Premier can help narrow the search around your location, budget, and property needs."
        label="Talk to RC Premier"
        href="/contact"
      />
      <DevHomepagePreview />
    </main>
  );
}
