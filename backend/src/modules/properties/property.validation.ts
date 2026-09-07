import {
  ADMIN_PROPERTY_CONTENT_FIELDS,
  LISTING_PURPOSES,
  PROPERTY_AVAILABILITY,
  PROPERTY_PUBLICATION_STATUSES,
  PUBLIC_PROPERTY_AREAS,
  PUBLIC_LOCATION_PRECISIONS,
  PROPERTY_SORT_OPTIONS,
  PROPERTY_TYPES,
  type AdminPropertyContentInput,
  type AdminPropertyAvailabilityRequest,
  type AdminPropertyListRequest,
  type AdminPropertyTransitionRequest,
  type CreateDraftPropertyRequest,
  type PropertySearchFilters,
  type PropertySearchRequest,
  type UpdateDraftPropertyRequest,
  type ValidationIssue,
} from "@rc/shared";
import { Types } from "mongoose";
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
const MAX_ADMIN_LIST_LIMIT = 50;
const MAX_LIST_ITEMS = 50;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  prefix: string,
  issues: ValidationIssue[],
): void {
  const allowedFields = new Set(allowed);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      issues.push({
        field: prefix ? `${prefix}.${field}` : field,
        message: "Unknown field.",
      });
    }
  }
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
  issues: ValidationIssue[],
): string | undefined {
  if (typeof value !== "string") {
    issues.push({ field, message: "Must be text." });
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    issues.push({ field, message: "Is required." });
    return undefined;
  }
  if (normalized.length > maxLength) {
    issues.push({ field, message: `Must be at most ${maxLength} characters.` });
    return undefined;
  }
  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
  issues: ValidationIssue[],
): string | undefined {
  if (value === undefined || value === "") return undefined;
  return requiredText(value, field, maxLength, issues);
}

function requiredBoolean(
  value: unknown,
  field: string,
  issues: ValidationIssue[],
): boolean | undefined {
  if (typeof value !== "boolean") {
    issues.push({ field, message: "Must be true or false." });
    return undefined;
  }
  return value;
}

function boundedBodyNumber(
  value: unknown,
  field: string,
  maximum: number,
  issues: ValidationIssue[],
  integer = false,
): number | undefined {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    issues.push({
      field,
      message: integer
        ? `Must be a whole number from 0 to ${maximum}.`
        : `Must be a number from 0 to ${maximum}.`,
    });
    return undefined;
  }
  return value;
}

function bodyEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push({ field, message: `Must be one of: ${allowed.join(", ")}.` });
    return undefined;
  }
  return value as T[number];
}

function textList(
  value: unknown,
  field: string,
  issues: ValidationIssue[],
): string[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    issues.push({
      field,
      message: `Must be a list with at most ${MAX_LIST_ITEMS} items.`,
    });
    return undefined;
  }
  const normalized: string[] = [];
  for (const [index, item] of value.entries()) {
    const text = requiredText(item, `${field}.${index}`, 200, issues);
    if (text && !normalized.includes(text)) normalized.push(text);
  }
  return normalized;
}

function parsePrice(
  value: unknown,
  required: boolean,
  issues: ValidationIssue[],
): AdminPropertyContentInput["price"] | undefined {
  if (value === undefined && !required) return undefined;
  if (!isRecord(value)) {
    issues.push({ field: "price", message: "Must be an object." });
    return undefined;
  }
  unknownFields(value, ["amount", "negotiable"], "price", issues);
  const amount = boundedBodyNumber(value.amount, "price.amount", MAX_PRICE, issues);
  const negotiable = requiredBoolean(value.negotiable, "price.negotiable", issues);
  return amount !== undefined && negotiable !== undefined
    ? { amount, negotiable }
    : undefined;
}

function parseLocation(
  value: unknown,
  required: boolean,
  issues: ValidationIssue[],
): AdminPropertyContentInput["location"] | undefined {
  if (value === undefined && !required) return undefined;
  if (!isRecord(value)) {
    issues.push({ field: "location", message: "Must be an object." });
    return undefined;
  }
  unknownFields(
    value,
    ["province", "city", "barangay", "development", "publicPrecision"],
    "location",
    issues,
  );
  const province = requiredText(value.province, "location.province", 100, issues);
  const city = requiredText(value.city, "location.city", 100, issues);
  const barangay = optionalText(value.barangay, "location.barangay", 100, issues);
  const development = optionalText(
    value.development,
    "location.development",
    140,
    issues,
  );
  const publicPrecision = bodyEnum(
    value.publicPrecision,
    "location.publicPrecision",
    PUBLIC_LOCATION_PRECISIONS,
    issues,
  );
  if (!province || !city || !publicPrecision) return undefined;
  return {
    province,
    city,
    ...(barangay ? { barangay } : {}),
    ...(development ? { development } : {}),
    publicPrecision,
  };
}

function parseSpecifications(
  value: unknown,
  required: boolean,
  issues: ValidationIssue[],
): AdminPropertyContentInput["specifications"] | undefined {
  if (value === undefined && !required) return undefined;
  if (!isRecord(value)) {
    issues.push({ field: "specifications", message: "Must be an object." });
    return undefined;
  }
  const fields = [
    "bedrooms",
    "bathrooms",
    "parkingSpaces",
    "lotAreaSqm",
    "floorAreaSqm",
    "storeys",
    "furnishing",
  ] as const;
  unknownFields(value, fields, "specifications", issues);
  const result: AdminPropertyContentInput["specifications"] = {};
  for (const field of ["bedrooms", "bathrooms", "parkingSpaces", "storeys"] as const) {
    if (value[field] !== undefined) {
      const parsed = boundedBodyNumber(
        value[field],
        `specifications.${field}`,
        MAX_ROOM_COUNT,
        issues,
        true,
      );
      if (parsed !== undefined) result[field] = parsed;
    }
  }
  for (const field of ["lotAreaSqm", "floorAreaSqm"] as const) {
    if (value[field] !== undefined) {
      const parsed = boundedBodyNumber(
        value[field],
        `specifications.${field}`,
        MAX_AREA_SQM,
        issues,
      );
      if (parsed !== undefined) result[field] = parsed;
    }
  }
  const furnishing = optionalText(
    value.furnishing,
    "specifications.furnishing",
    100,
    issues,
  );
  if (furnishing) result.furnishing = furnishing;
  return result;
}

function parseAdminPropertyContent(
  rawBody: unknown,
  mode: "create" | "update",
): CreateDraftPropertyRequest | UpdateDraftPropertyRequest {
  const issues: ValidationIssue[] = [];
  if (!isRecord(rawBody)) {
    throw new HttpError(400, "Invalid property request.", [
      { field: "body", message: "Must be a JSON object." },
    ]);
  }
  unknownFields(
    rawBody,
    mode === "update"
      ? [...ADMIN_PROPERTY_CONTENT_FIELDS, "expectedVersion"]
      : ADMIN_PROPERTY_CONTENT_FIELDS,
    "",
    issues,
  );
  if (
    mode === "update" &&
    !ADMIN_PROPERTY_CONTENT_FIELDS.some((field) => rawBody[field] !== undefined)
  ) {
    issues.push({ field: "body", message: "Provide at least one field to update." });
  }

  const required = mode === "create";
  const result: Partial<AdminPropertyContentInput> = {};

  const propertyId =
    rawBody.propertyId !== undefined || required
      ? requiredText(rawBody.propertyId, "propertyId", 40, issues)
      : undefined;
  if (propertyId) {
    if (!PROPERTY_ID_PATTERN.test(propertyId)) {
      issues.push({
        field: "propertyId",
        message: "May contain only letters, numbers, hyphens, and underscores.",
      });
    } else {
      result.propertyId = propertyId.toUpperCase();
    }
  }

  const slug =
    rawBody.slug !== undefined || required
      ? requiredText(rawBody.slug, "slug", 160, issues)
      : undefined;
  if (slug) {
    if (!SLUG_PATTERN.test(slug)) {
      issues.push({
        field: "slug",
        message: "Must be lowercase words separated by single hyphens.",
      });
    } else {
      result.slug = slug;
    }
  }

  for (const [field, maximum] of [
    ["title", 180],
    ["shortDescription", 500],
    ["description", 10_000],
  ] as const) {
    if (rawBody[field] !== undefined || required) {
      const parsed = requiredText(rawBody[field], field, maximum, issues);
      if (parsed) result[field] = parsed;
    }
  }

  if (rawBody.purpose !== undefined || required) {
    const value = bodyEnum(rawBody.purpose, "purpose", LISTING_PURPOSES, issues);
    if (value) result.purpose = value;
  }
  if (rawBody.propertyType !== undefined || required) {
    const value = bodyEnum(
      rawBody.propertyType,
      "propertyType",
      PROPERTY_TYPES,
      issues,
    );
    if (value) result.propertyType = value;
  }
  if (rawBody.featured !== undefined || required) {
    const value = requiredBoolean(rawBody.featured, "featured", issues);
    if (value !== undefined) result.featured = value;
  }

  const price = parsePrice(rawBody.price, required, issues);
  if (price) result.price = price;
  const location = parseLocation(rawBody.location, required, issues);
  if (location) result.location = location;
  const specifications = parseSpecifications(rawBody.specifications, required, issues);
  if (specifications) result.specifications = specifications;

  for (const field of ["highlights", "amenities", "features"] as const) {
    if (rawBody[field] !== undefined || required) {
      const value = textList(rawBody[field], field, issues);
      if (value) result[field] = value;
    }
  }

  if (issues.length > 0) {
    throw new HttpError(400, "Invalid property request.", issues);
  }
  return result as CreateDraftPropertyRequest | UpdateDraftPropertyRequest;
}

export function parseCreateDraftPropertyBody(
  rawBody: unknown,
): CreateDraftPropertyRequest {
  return parseAdminPropertyContent(rawBody, "create") as CreateDraftPropertyRequest;
}

export function parseUpdateDraftPropertyBody(
  rawBody: unknown,
): UpdateDraftPropertyRequest {
  const content = parseAdminPropertyContent(
    rawBody,
    "update",
  ) as Partial<AdminPropertyContentInput>;
  const body = rawBody as Record<string, unknown>;
  const issues: ValidationIssue[] = [];
  const expectedVersion = boundedBodyNumber(
    body.expectedVersion,
    "expectedVersion",
    Number.MAX_SAFE_INTEGER,
    issues,
    true,
  );
  if (expectedVersion === undefined) {
    if (issues.length === 0) {
      issues.push({ field: "expectedVersion", message: "Is required." });
    }
    throw new HttpError(400, "Invalid property request.", issues);
  }
  return { ...content, expectedVersion };
}

function parseVersionedBody(
  rawBody: unknown,
  allowedFields: readonly string[],
): { body: Record<string, unknown>; expectedVersion: number } {
  const issues: ValidationIssue[] = [];
  if (!isRecord(rawBody)) {
    throw new HttpError(400, "Invalid property lifecycle request.", [
      { field: "body", message: "Must be a JSON object." },
    ]);
  }
  unknownFields(rawBody, allowedFields, "", issues);
  const expectedVersion = boundedBodyNumber(
    rawBody.expectedVersion,
    "expectedVersion",
    Number.MAX_SAFE_INTEGER,
    issues,
    true,
  );
  if (expectedVersion === undefined && issues.length === 0) {
    issues.push({ field: "expectedVersion", message: "Is required." });
  }
  if (issues.length > 0 || expectedVersion === undefined) {
    throw new HttpError(400, "Invalid property lifecycle request.", issues);
  }
  return { body: rawBody, expectedVersion };
}

export function parseAdminPropertyTransitionBody(
  rawBody: unknown,
): AdminPropertyTransitionRequest {
  const { expectedVersion } = parseVersionedBody(rawBody, ["expectedVersion"]);
  return { expectedVersion };
}

export function parseAdminPropertyAvailabilityBody(
  rawBody: unknown,
): AdminPropertyAvailabilityRequest {
  const { body, expectedVersion } = parseVersionedBody(rawBody, [
    "expectedVersion",
    "availability",
  ]);
  const issues: ValidationIssue[] = [];
  const availability = bodyEnum(
    body.availability,
    "availability",
    PROPERTY_AVAILABILITY,
    issues,
  );
  if (!availability || issues.length > 0) {
    throw new HttpError(400, "Invalid property lifecycle request.", issues);
  }
  return { expectedVersion, availability };
}

export function parseAdminPropertyListQuery(query: RawQuery): AdminPropertyListRequest {
  const issues: ValidationIssue[] = [];
  for (const field of Object.keys(query)) {
    if (
      !["query", "publicationStatus", "availability", "page", "limit"].includes(field)
    ) {
      issues.push({ field, message: "Unknown query parameter." });
    }
  }
  const publicationStatus = enumValue(
    query,
    "publicationStatus",
    PROPERTY_PUBLICATION_STATUSES,
    issues,
  );
  const availability = enumValue(query, "availability", PROPERTY_AVAILABILITY, issues);
  const searchQuery = boundedString(query, "query", 120, issues);
  const page =
    nonNegativeNumber(query, "page", issues, {
      integer: true,
      minimum: 1,
      maximum: 100_000,
    }) ?? 1;
  const limit =
    nonNegativeNumber(query, "limit", issues, {
      integer: true,
      minimum: 1,
      maximum: MAX_ADMIN_LIST_LIMIT,
    }) ?? 25;
  if (issues.length > 0) {
    throw new HttpError(400, "Invalid private property parameters.", issues);
  }
  return {
    ...(searchQuery ? { query: searchQuery } : {}),
    ...(publicationStatus ? { publicationStatus } : {}),
    ...(availability ? { availability } : {}),
    page,
    limit,
  };
}

export function parseAdminPropertyId(rawId: unknown): string {
  if (
    typeof rawId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(rawId) ||
    !Types.ObjectId.isValid(rawId)
  ) {
    throw new HttpError(400, "Invalid property ID.", [
      { field: "id", message: "Must be a valid property identifier." },
    ]);
  }
  return rawId;
}
