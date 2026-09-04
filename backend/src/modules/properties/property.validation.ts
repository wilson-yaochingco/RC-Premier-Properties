import {
  LISTING_PURPOSES,
  PUBLIC_PROPERTY_AREAS,
  PROPERTY_SORT_OPTIONS,
  PROPERTY_TYPES,
  type PropertySearchFilters,
  type PropertySearchRequest,
  type ValidationIssue,
} from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";

const ALLOWED_QUERY_FIELDS = new Set([
  "keyword",
  "propertyId",
  "area",
  "location",
  "propertyType",
  "purpose",
  "minPrice",
  "maxPrice",
  "bedrooms",
  "bathrooms",
  "minLotArea",
  "minFloorArea",
  "featured",
  "sort",
  "page",
  "limit",
]);

const PROPERTY_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;
const MAX_PRICE = 1_000_000_000_000;
const MAX_ROOM_COUNT = 100;
const MAX_AREA_SQM = 100_000_000;

type RawQuery = Record<string, unknown>;

function singleString(
  query: RawQuery,
  field: string,
  issues: ValidationIssue[],
): string | undefined {
  const raw = query[field];
  if (raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string") {
    issues.push({ field, message: "Must be a single text value." });
    return undefined;
  }
  const normalized = raw.trim();
  return normalized === "" ? undefined : normalized;
}

function boundedString(
  query: RawQuery,
  field: string,
  maxLength: number,
  issues: ValidationIssue[],
): string | undefined {
  const value = singleString(query, field, issues);
  if (value && value.length > maxLength) {
    issues.push({ field, message: `Must be at most ${maxLength} characters.` });
    return undefined;
  }
  return value;
}

function nonNegativeNumber(
  query: RawQuery,
  field: string,
  issues: ValidationIssue[],
  options: { integer?: boolean; minimum?: number; maximum?: number } = {},
): number | undefined {
  const raw = singleString(query, field, issues);
  if (raw === undefined) return undefined;
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) {
    issues.push({ field, message: "Must be a non-negative number." });
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || (options.integer && !Number.isInteger(value))) {
    issues.push({
      field,
      message: options.integer ? "Must be a whole number." : "Must be a valid number.",
    });
    return undefined;
  }
  if (options.minimum !== undefined && value < options.minimum) {
    issues.push({ field, message: `Must be at least ${options.minimum}.` });
    return undefined;
  }
  if (options.maximum !== undefined && value > options.maximum) {
    issues.push({ field, message: `Must be at most ${options.maximum}.` });
    return undefined;
  }
  return value;
}

function enumValue<const T extends readonly string[]>(
  query: RawQuery,
  field: string,
  allowed: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  const value = singleString(query, field, issues);
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) {
    issues.push({ field, message: `Must be one of: ${allowed.join(", ")}.` });
    return undefined;
  }
  return value;
}

function booleanValue(
  query: RawQuery,
  field: string,
  issues: ValidationIssue[],
): boolean | undefined {
  const value = singleString(query, field, issues);
  if (value === undefined) return undefined;
  if (value !== "true" && value !== "false") {
    issues.push({ field, message: 'Must be either "true" or "false".' });
    return undefined;
  }
  return value === "true";
}

export function parsePropertySearchQuery(query: RawQuery): PropertySearchRequest {
  const issues: ValidationIssue[] = [];

  for (const field of Object.keys(query)) {
    if (!ALLOWED_QUERY_FIELDS.has(field)) {
      issues.push({ field, message: "Unknown query parameter." });
    }
  }

  const keyword = boundedString(query, "keyword", 120, issues);
  const propertyId = boundedString(query, "propertyId", 40, issues);
  const area = enumValue(query, "area", PUBLIC_PROPERTY_AREAS, issues);
  const location = boundedString(query, "location", 120, issues);
  const propertyType = enumValue(query, "propertyType", PROPERTY_TYPES, issues);
  const purpose = enumValue(query, "purpose", LISTING_PURPOSES, issues);
  const minPrice = nonNegativeNumber(query, "minPrice", issues, {
    maximum: MAX_PRICE,
  });
  const maxPrice = nonNegativeNumber(query, "maxPrice", issues, {
    maximum: MAX_PRICE,
  });
  const bedrooms = nonNegativeNumber(query, "bedrooms", issues, {
    integer: true,
    maximum: MAX_ROOM_COUNT,
  });
  const bathrooms = nonNegativeNumber(query, "bathrooms", issues, {
    integer: true,
    maximum: MAX_ROOM_COUNT,
  });
  const minLotArea = nonNegativeNumber(query, "minLotArea", issues, {
    maximum: MAX_AREA_SQM,
  });
  const minFloorArea = nonNegativeNumber(query, "minFloorArea", issues, {
    maximum: MAX_AREA_SQM,
  });
  const featured = booleanValue(query, "featured", issues);
  const sort = enumValue(query, "sort", PROPERTY_SORT_OPTIONS, issues) ?? "newest";
  const page =
    nonNegativeNumber(query, "page", issues, {
      integer: true,
      minimum: 1,
      maximum: 100_000,
    }) ?? DEFAULT_PAGE;
  const limit =
    nonNegativeNumber(query, "limit", issues, {
      integer: true,
      minimum: 1,
      maximum: MAX_LIMIT,
    }) ?? DEFAULT_LIMIT;

  if (propertyId && !PROPERTY_ID_PATTERN.test(propertyId)) {
    issues.push({
      field: "propertyId",
      message: "May contain only letters, numbers, hyphens, and underscores.",
    });
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    issues.push({
      field: "maxPrice",
      message: "Must be greater than or equal to minimum price.",
    });
  }

  if (issues.length > 0) {
    throw new HttpError(400, "Invalid property search parameters.", issues);
  }

  const filters: PropertySearchFilters = {
    ...(keyword ? { keyword } : {}),
    ...(propertyId ? { propertyId: propertyId.toUpperCase() } : {}),
    ...(area ? { area } : {}),
    ...(location ? { location } : {}),
    ...(propertyType ? { propertyType } : {}),
    ...(purpose ? { purpose } : {}),
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    ...(bedrooms !== undefined ? { bedrooms } : {}),
    ...(bathrooms !== undefined ? { bathrooms } : {}),
    ...(minLotArea !== undefined ? { minLotArea } : {}),
    ...(minFloorArea !== undefined ? { minFloorArea } : {}),
    ...(featured !== undefined ? { featured } : {}),
  };

  return { ...filters, sort, page, limit };
}

/** Validate map filters while keeping pagination/sort as server-owned concerns. */
export function parsePropertyMapQuery(query: RawQuery): PropertySearchRequest {
  const prohibited = ["sort", "page", "limit"].filter(
    (field) => query[field] !== undefined,
  );
  if (prohibited.length > 0) {
    throw new HttpError(
      400,
      "Invalid property map parameters.",
      prohibited.map((field) => ({
        field,
        message: "This parameter is controlled by the map endpoint.",
      })),
    );
  }

  return parsePropertySearchQuery({
    ...query,
    sort: "newest",
    page: "1",
    limit: String(MAX_LIMIT),
  });
}

export function parsePropertySlug(rawSlug: unknown): string {
  if (
    typeof rawSlug !== "string" ||
    rawSlug.length > 160 ||
    !SLUG_PATTERN.test(rawSlug)
  ) {
    throw new HttpError(400, "Invalid property slug.", [
      { field: "slug", message: "Must be a lowercase, hyphen-separated slug." },
    ]);
  }
  return rawSlug;
}
