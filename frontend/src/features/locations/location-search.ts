import {
  RESIDENTIAL_SALE_PROPERTY_TYPES,
  SALE_PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type PropertyFacetsResponse,
  type PropertyType,
} from "@rc/shared";
import { shortPublicLocation } from "../../lib/public-location";
import { FEATURED_LOCATIONS } from "./featured-locations";

/**
 * Filters the Locations search can offer. Every option maps to a real `/properties` query
 * parameter (`location`, `propertyType`, `minPrice`/`maxPrice`, `bedrooms`); the options
 * come from the public facets when they loaded and fall back to the curated and residential
 * defaults when they did not. Nothing here describes a property or a place.
 */
export interface SearchFilters {
  /** Facets that loaded, or `undefined` when they could not be retrieved. */
  locations?: readonly string[];
  propertyTypes?: readonly PropertyType[];
  priceRange?: { min: number | null; max: number | null };
}

export interface BudgetBand {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

/** Practical price bands (PHP); they are presets for the catalog's min/max price filters. */
export const BUDGET_BANDS: readonly BudgetBand[] = [
  { id: "u3", label: "Up to ₱3M", max: 3_000_000 },
  { id: "3-6", label: "₱3M – ₱6M", min: 3_000_000, max: 6_000_000 },
  { id: "6-10", label: "₱6M – ₱10M", min: 6_000_000, max: 10_000_000 },
  { id: "10-20", label: "₱10M – ₱20M", min: 10_000_000, max: 20_000_000 },
  { id: "20+", label: "₱20M and above", min: 20_000_000 },
];

export const BEDROOM_OPTIONS = [
  { value: "2", label: "2+ bedrooms" },
  { value: "3", label: "3+ bedrooms" },
  { value: "4", label: "4+ bedrooms" },
] as const;

export interface SearchOptions {
  locations: string[];
  propertyTypes: Array<{ value: PropertyType; label: string }>;
  budgets: BudgetBand[];
}

/** Every curated location plus any other location the facets report, alphabetically. */
export function locationOptions(filters: SearchFilters): string[] {
  const names = new Set<string>(FEATURED_LOCATIONS.map(({ name }) => name));
  for (const location of filters.locations ?? []) {
    const name = shortPublicLocation(location);
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function buildSearchOptions(filters: SearchFilters): SearchOptions {
  const supported = new Set<PropertyType>(SALE_PROPERTY_TYPES);
  const types: readonly PropertyType[] = filters.propertyTypes
    ? filters.propertyTypes.filter((type) => supported.has(type))
    : RESIDENTIAL_SALE_PROPERTY_TYPES;
  const range = filters.priceRange;
  const budgets = BUDGET_BANDS.filter((band) => {
    if (!range || range.min === null || range.max === null) return true;
    return (
      (band.max === undefined || band.max >= range.min) &&
      (band.min === undefined || band.min <= range.max)
    );
  });
  return {
    locations: locationOptions(filters),
    propertyTypes: types.map((value) => ({
      value,
      label: PROPERTY_TYPE_LABELS[value],
    })),
    budgets,
  };
}

export function searchFiltersFromFacets(
  facets: Pick<PropertyFacetsResponse, "locations" | "propertyTypes" | "priceRange">,
): SearchFilters {
  return {
    locations: facets.locations,
    propertyTypes: facets.propertyTypes,
    priceRange: { min: facets.priceRange.min, max: facets.priceRange.max },
  };
}

export interface SearchSelection {
  location: string;
  propertyType: string;
  budget: string;
  bedrooms: string;
}

/** Clean `/properties` URL: only the filters the visitor actually chose are serialized. */
export function buildSearchHref(selection: SearchSelection): string {
  const query = new URLSearchParams();
  if (selection.location) query.set("location", selection.location);
  if (selection.propertyType) query.set("propertyType", selection.propertyType);
  const band = BUDGET_BANDS.find(({ id }) => id === selection.budget);
  if (band?.min !== undefined) query.set("minPrice", String(band.min));
  if (band?.max !== undefined) query.set("maxPrice", String(band.max));
  if (selection.bedrooms) query.set("bedrooms", selection.bedrooms);
  return `/properties${query.size ? `?${query.toString()}` : ""}`;
}
