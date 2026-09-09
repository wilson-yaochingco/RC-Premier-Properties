import {
  PROPERTY_SORT_OPTIONS,
  PROPERTY_AVAILABILITY,
  RESIDENTIAL_SALE_PROPERTY_TYPES,
  type ListingPurpose,
  type PropertyAvailability,
  type PropertySearchFilters,
  type PropertySort,
  type PropertyType,
} from "@rc/shared";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface PropertyFormValues {
  keyword: string;
  propertyId: string;
  location: string;
  propertyType: "" | PropertyType;
  availability: "" | PropertyAvailability;
  purpose: "" | ListingPurpose;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  minLotArea: string;
  minFloorArea: string;
  sort: PropertySort;
  page: string;
}

const STRING_FILTERS = ["keyword", "propertyId", "location"] as const;
const NUMBER_FILTERS = [
  "minPrice",
  "maxPrice",
  "bedrooms",
  "bathrooms",
  "minLotArea",
  "minFloorArea",
] as const;

function firstValue(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim().slice(0, 200) ?? "";
}

function oneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return options.some((option) => option === value);
}

export function propertyFormValues(searchParams: RawSearchParams): PropertyFormValues {
  const propertyType = firstValue(searchParams.propertyType);
  const sort = firstValue(searchParams.sort);

  return {
    keyword: firstValue(searchParams.keyword),
    propertyId: firstValue(searchParams.propertyId),
    location: firstValue(searchParams.location),
    propertyType: oneOf(propertyType, RESIDENTIAL_SALE_PROPERTY_TYPES)
      ? propertyType
      : "",
    availability: oneOf(firstValue(searchParams.availability), PROPERTY_AVAILABILITY)
      ? (firstValue(searchParams.availability) as PropertyAvailability)
      : "",
    purpose: "sale",
    minPrice: firstValue(searchParams.minPrice),
    maxPrice: firstValue(searchParams.maxPrice),
    bedrooms: firstValue(searchParams.bedrooms),
    bathrooms: firstValue(searchParams.bathrooms),
    minLotArea: firstValue(searchParams.minLotArea),
    minFloorArea: firstValue(searchParams.minFloorArea),
    sort: oneOf(sort, PROPERTY_SORT_OPTIONS) ? sort : "newest",
    page: firstValue(searchParams.page) || "1",
  };
}

/** Keep only the documented property-search keys before calling the API. */
export function propertyApiSearchParams(
  searchParams: RawSearchParams,
): URLSearchParams {
  const values = propertyFormValues(searchParams);
  const output = new URLSearchParams();

  for (const key of STRING_FILTERS) {
    if (values[key]) output.set(key, values[key]);
  }

  if (values.propertyType) output.set("propertyType", values.propertyType);
  if (values.availability) output.set("availability", values.availability);
  output.set("purpose", "sale");

  for (const key of NUMBER_FILTERS) {
    if (values[key]) output.set(key, values[key]);
  }

  output.set("sort", values.sort);
  output.set("page", values.page);
  output.set("limit", "9");

  return output;
}

/** Canonical filters for the lazy map endpoint (sorting/pagination stay server-owned). */
export function propertyMapApiSearchParams(
  searchParams: RawSearchParams,
): URLSearchParams {
  const query = propertyApiSearchParams(searchParams);
  query.delete("sort");
  query.delete("page");
  query.delete("limit");
  return query;
}

export function paginationHref(searchParams: RawSearchParams, page: number): string {
  const query = propertyApiSearchParams(searchParams);
  query.delete("limit");
  query.set("page", String(page));
  return `/properties?${query.toString()}`;
}

export function removePropertyFilterHref(
  searchParams: RawSearchParams,
  key: keyof PropertyFormValues,
): string {
  const query = propertyApiSearchParams(searchParams);
  query.delete("limit");
  query.delete("page");
  if (key === "sort") query.set("sort", "newest");
  else query.delete(key);
  return `/properties${query.size ? `?${query.toString()}` : ""}`;
}

/** Apply a map-area selection to the same canonical URL state used by the form. */
export function mapLocationHref(
  searchParams: RawSearchParams,
  location: string,
): string {
  const query = propertyApiSearchParams(searchParams);
  query.delete("page");
  query.delete("limit");
  if (location.trim()) query.set("location", location.trim());
  else query.delete("location");
  return `/properties${query.size ? `?${query.toString()}` : ""}`;
}

export function activePropertyFilters(
  values: PropertyFormValues,
): PropertySearchFilters {
  const filters: PropertySearchFilters = {};

  for (const key of STRING_FILTERS) {
    if (values[key]) filters[key] = values[key];
  }

  if (values.propertyType) filters.propertyType = values.propertyType;
  if (values.availability) filters.availability = values.availability;
  if (values.purpose) filters.purpose = values.purpose;

  for (const key of NUMBER_FILTERS) {
    const parsed = Number(values[key]);
    if (values[key] && Number.isFinite(parsed)) filters[key] = parsed;
  }

  return filters;
}
