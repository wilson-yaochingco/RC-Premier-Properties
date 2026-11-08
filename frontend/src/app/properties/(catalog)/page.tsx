import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { PropertyFacetsResponse } from "@rc/shared";
import propertiesImage from "@/assets/site/properties.png";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { PageMotion } from "@/components/layout/PageMotion";
import { ExplorePampangaSection } from "@/features/home/ExplorePampanga";
import { PropertiesHero } from "@/features/properties/PropertiesHero";
import {
  PropertyJourney,
  PropertyValues,
} from "@/features/properties/PropertyEditorial";
import {
  activeCatalogFixture,
  loadCatalogInventory,
  withCatalogFixture,
} from "@/features/properties/catalog-inventory";
import { PropertyCatalogCard } from "@/features/properties/PropertyCatalogCard";
import { PropertyCatalogFilters } from "@/features/properties/PropertyCatalogFilters";
import {
  CatalogClearAll,
  CatalogHeading,
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
import { wholePriceQuery } from "@/features/properties/property-price-filter";
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
  // These chips select exact counts; other API consumers retain minimum-count matching.
  if (rawSearchParams.bedrooms) rawSearchParams.bedroomsMatch = "exact";
  const resultQuery = new URLSearchParams();
  Object.entries(rawSearchParams).forEach(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (first && key !== "catalogFixture") resultQuery.set(key, first);
  });
  let priceQueryChanged = false;
  for (const key of ["minPrice", "maxPrice"] as const) {
    const raw = resultQuery.get(key);
    const whole = raw ? wholePriceQuery(raw) : undefined;
    if (whole !== undefined && whole !== raw) {
      resultQuery.set(key, whole);
      priceQueryChanged = true;
    }
  }
  if (priceQueryChanged)
    redirect(
      withCatalogFixture(
        `/properties?${resultQuery}`,
        activeCatalogFixture(rawSearchParams.catalogFixture),
      ),
    );
  const resultsHref = `/properties${resultQuery.size ? `?${resultQuery.toString()}` : ""}`;
  const values = propertyFormValues(rawSearchParams);
  const fixture = activeCatalogFixture(rawSearchParams.catalogFixture);
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

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <PageMotion />
      <PropertiesHero>
        <PropertyCatalogFilters values={values} fixture={fixture} />
      </PropertiesHero>

      <section className={styles.results} aria-labelledby="property-results-title">
        <div className={styles.container}>
          {response ? (
            <>
              <div className={styles.resultsBar}>
                <CatalogHeading total={response.pagination.total} />
                <div className={styles.resultsActions}>
                  <CatalogClearAll values={values} fixture={fixture} />
                  <CatalogSort
                    current={values.sort}
                    searchParams={rawSearchParams}
                    fixture={fixture}
                  />
                </div>
              </div>
              {response.items.length > 0 ? (
                <>
                  <ul
                    className={styles.grid}
                    data-count={Math.min(response.items.length, 9)}
                    aria-label="Available properties"
                    data-motion="sequence"
                  >
                    {response.items.slice(0, 4).map((property, index) => (
                      <li
                        key={property.id}
                        data-motion-step="photos"
                        data-motion-at={index * 0.16}
                      >
                        <PropertyCatalogCard
                          property={property}
                          resultsHref={resultsHref}
                          priority={index < 2}
                        />
                      </li>
                    ))}
                  </ul>
                  {response.items.length > 4 ? (
                    <section
                      className={styles.secondary}
                      aria-labelledby="more-properties-heading"
                    >
                      <h2
                        id="more-properties-heading"
                        className={styles.sectionHeading}
                        data-motion="heading"
                      >
                        More homes to <em>explore</em>
                      </h2>
                      <ul
                        className={styles.secondaryGrid}
                        aria-label="More available properties"
                        data-motion="sequence"
                      >
                        {response.items.slice(4).map((property, index) => (
                          <li
                            key={property.id}
                            data-motion-step="photos"
                            data-motion-at={index * 0.12}
                          >
                            <PropertyCatalogCard
                              property={property}
                              resultsHref={resultsHref}
                              compact
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
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

      <ExplorePampangaSection />
      <PropertyValues />
      <PropertyJourney
        propertyHref={
          response?.items[0]
            ? `/properties/${response.items[0].slug}?from=${encodeURIComponent(resultsHref)}`
            : undefined
        }
      />

      <EditorialCta
        id="properties-cta-heading"
        eyebrow="Still looking?"
        headline={["Let’s find the right", "*property* for you"]}
        body="Tell us what matters most and RC Premier can help narrow the search around your location, budget, and property needs."
        label="Talk to RC Premier"
        href="/contact"
        wide
      />
    </main>
  );
}
