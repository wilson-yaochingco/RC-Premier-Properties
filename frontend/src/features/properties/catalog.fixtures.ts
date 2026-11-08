/**
 * DEVELOPMENT ONLY. Design fixtures for the `/properties` catalog, loaded exclusively
 * through the guarded dynamic import in `catalog-inventory.ts`. Reuses the homepage
 * Featured fixtures and repeats them to reach the requested count.
 *
 * Results and filter facets come from the same dataset, and the page's filters are applied
 * to it, so the form behaves like it does against the real API.
 */
import type {
  PropertyFacetsResponse,
  PropertySearchResponse,
  PublicPropertySummary,
} from "@rc/shared";
import { FEATURED_FIXTURE_PROPERTIES } from "../home/featured-properties.fixtures";
import { propertyFormValues, type RawSearchParams } from "./property-query";

const PAGE_SIZE = 9;

function fixtureProperties(count: number): PublicPropertySummary[] {
  const base = FEATURED_FIXTURE_PROPERTIES.three;
  return Array.from({ length: count }, (_, index) => {
    const source = base[index % base.length];
    const id = `fixture-catalog-${index + 1}`;
    return {
      ...source,
      id,
      slug: id,
      propertyId: `RCPP-FIXTURE-${index + 1}`,
      publishedAt: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
    };
  });
}

function countBy(values: string[]): Array<{ location: string; count: number }> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
}

/** Facets for the whole fixture dataset, shaped like `GET /properties/facets`. */
function fixtureFacets(items: PublicPropertySummary[]): PropertyFacetsResponse {
  const locationCounts = countBy(items.map(({ location }) => location.city));
  const prices = items.map(({ price }) => price.amount);
  return {
    locations: locationCounts.map(({ location }) => location).sort(),
    locationCounts,
    activeLocationCounts: countBy(
      items
        .filter(({ availability }) => availability !== "sold")
        .map(({ location }) => location.city),
    ),
    propertyTypes: [...new Set(items.map(({ propertyType }) => propertyType))].sort(),
    priceRange: {
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      currency: "PHP",
    },
  };
}

function includes(haystack: Array<string | undefined>, needle: string): boolean {
  const lower = needle.toLocaleLowerCase("en-US");
  return haystack.some((part) => part?.toLocaleLowerCase("en-US").includes(lower));
}

function filterFixture(
  items: PublicPropertySummary[],
  searchParams: RawSearchParams,
): PublicPropertySummary[] {
  const values = propertyFormValues(searchParams);
  const min = (value: string) => (value ? Number(value) : undefined);
  const minPrice = min(values.minPrice);
  const maxPrice = min(values.maxPrice);
  const bedrooms = min(values.bedrooms);
  const bathrooms = min(values.bathrooms);
  const minLot = min(values.minLotArea);
  const minFloor = min(values.minFloorArea);

  const kept = items.filter((item) => {
    const { location, specifications: specs } = item;
    return (
      (!values.location ||
        includes(
          [location.province, location.city, location.barangay, location.development],
          values.location,
        )) &&
      (!values.propertyType || item.propertyType === values.propertyType) &&
      (!values.availability || item.availability === values.availability) &&
      (!values.keyword ||
        includes(
          [item.title, item.shortDescription, item.propertyId, location.development],
          values.keyword,
        )) &&
      (!values.propertyId ||
        includes([item.propertyId], values.propertyId.replace(/^#/, ""))) &&
      (minPrice === undefined || item.price.amount >= minPrice) &&
      (maxPrice === undefined || item.price.amount <= maxPrice) &&
      (bedrooms === undefined || (specs.bedrooms ?? 0) >= bedrooms) &&
      (bathrooms === undefined || (specs.bathrooms ?? 0) >= bathrooms) &&
      (minLot === undefined || (specs.lotAreaSqm ?? 0) >= minLot) &&
      (minFloor === undefined || (specs.floorAreaSqm ?? 0) >= minFloor)
    );
  });

  if (values.sort === "price-asc") kept.sort((a, b) => a.price.amount - b.price.amount);
  else if (values.sort === "price-desc")
    kept.sort((a, b) => b.price.amount - a.price.amount);
  else kept.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return kept;
}

export function catalogFixtureResult(
  count: number,
  searchParams: RawSearchParams,
): { response: PropertySearchResponse; facets: PropertyFacetsResponse } {
  const all = fixtureProperties(count);
  const items = filterFixture(all, searchParams);
  return {
    facets: fixtureFacets(all),
    response: {
      items: items.slice(0, PAGE_SIZE),
      pagination: {
        page: 1,
        limit: PAGE_SIZE,
        total: items.length,
        totalPages: items.length ? 1 : 0,
      },
      appliedFilters: { purpose: "sale" },
      sort: propertyFormValues(searchParams).sort,
    },
  };
}
