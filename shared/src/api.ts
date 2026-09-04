/**
 * The API contract shared by the RC Premier Properties frontend and backend.
 *
 * This is the single source of truth for anything that crosses the network boundary.
 * Both apps compile against it, so a change here surfaces as a type error on whichever
 * side has not been updated -- the contract is enforced by the compiler rather than by
 * discipline. Add request/response types for each new module beside these.
 */

/** API version served under `/api/<version>`. */
export const API_VERSION = "v1";

/** Path prefix every API route is mounted on. Backend mounts it; frontend builds URLs from it. */
export const API_PREFIX = `/api/${API_VERSION}`;

/** Mongoose connection states, mapped to readable labels. */
export type DatabaseConnectionStatus =
  "connected" | "connecting" | "disconnected" | "disconnecting" | "unknown";

export interface DatabaseStatus {
  status: DatabaseConnectionStatus;
  /** Raw mongoose `connection.readyState`. */
  readyState: number;
}

export type Environment = "development" | "test" | "production";

/** Body of `GET /api/v1/health`. */
export interface HealthResponse {
  status: "ok";
  service: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Process uptime in seconds. */
  uptime: number;
  environment: Environment;
  database: DatabaseStatus;
}

/** A field-level validation issue safe to show to an API consumer. */
export interface ValidationIssue {
  field: string;
  message: string;
}

/** Body returned by the backend error handler for every non-2xx response. */
export interface ApiErrorResponse {
  status: "error";
  statusCode: number;
  message: string;
  issues?: ValidationIssue[];
}

export const PROPERTY_TYPES = [
  "house-and-lot",
  "condominium",
  "townhouse",
  "lot",
  "commercial",
  "office",
  "warehouse",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  "house-and-lot": "House & lot",
  condominium: "Condominium",
  townhouse: "Townhouse",
  lot: "Lot / land",
  commercial: "Commercial",
  office: "Office",
  warehouse: "Warehouse",
};

export const LISTING_PURPOSES = ["sale", "rent"] as const;
export type ListingPurpose = (typeof LISTING_PURPOSES)[number];

export const PROPERTY_AVAILABILITY = [
  "available",
  "reserved",
  "sold",
  "rented",
] as const;
export type PropertyAvailability = (typeof PROPERTY_AVAILABILITY)[number];

export type PropertyCurrency = "PHP";

/**
 * Maximum location detail approved for a public listing.
 *
 * This setting controls both the textual location fields serialized by the backend and
 * the meaning of an optional public map point. It is deliberately separate from the
 * internal exact coordinates stored by the property model.
 */
export const PUBLIC_LOCATION_PRECISIONS = [
  "exact",
  "approximate",
  "subdivision",
  "barangay-area",
  "city-only",
] as const;

export type PublicLocationPrecision = (typeof PUBLIC_LOCATION_PRECISIONS)[number];

/** An independently approved public GeoJSON point. Coordinate order is longitude, latitude. */
export interface PublicMapPoint {
  type: "Point";
  coordinates: [longitude: number, latitude: number];
}

export interface PublicPropertyLocation {
  province: string;
  city: string;
  barangay?: string;
  development?: string;
  publicPrecision: PublicLocationPrecision;
  /**
   * A separately stored and approved public point. It is never derived from the
   * internal residential coordinate during public serialization.
   */
  publicPoint?: PublicMapPoint;
  /** Kept for existing API consumers; `publicPrecision` carries the detailed policy. */
  disclosure: "exact" | "general-area";
}

export interface PublicPropertySpecifications {
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  lotAreaSqm?: number;
  floorAreaSqm?: number;
  storeys?: number;
  furnishing?: string;
}

export type PropertyMediaKind = "image" | "video" | "floor-plan";

/**
 * Public media metadata. URLs stay optional while the media provider is intentionally
 * unselected; the frontend renders an explicit replacement placeholder when absent.
 */
export interface PublicPropertyMedia {
  kind: PropertyMediaKind;
  url?: string;
  alt: string;
}

export interface PublicPropertySummary {
  id: string;
  propertyId: string;
  slug: string;
  title: string;
  purpose: ListingPurpose;
  propertyType: PropertyType;
  availability: PropertyAvailability;
  featured: boolean;
  price: {
    amount: number;
    currency: PropertyCurrency;
    negotiable: boolean;
  };
  location: PublicPropertyLocation;
  specifications: PublicPropertySpecifications;
  shortDescription: string;
  coverMedia?: PublicPropertyMedia;
  publishedAt: string;
}

export interface PublicPropertyDetail extends PublicPropertySummary {
  description: string;
  highlights: string[];
  amenities: string[];
  features: string[];
  gallery: PublicPropertyMedia[];
  updatedAt: string;
}

export const PROPERTY_SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;
export type PropertySort = (typeof PROPERTY_SORT_OPTIONS)[number];

/** Public city and municipality areas selectable from the Pampanga discovery map. */
export const PUBLIC_PROPERTY_AREAS = [
  "Angeles City",
  "Apalit",
  "Arayat",
  "Bacolor",
  "Candaba",
  "City of San Fernando",
  "Floridablanca",
  "Guagua",
  "Lubao",
  "Mabalacat City",
  "Macabebe",
  "Magalang",
  "Masantol",
  "Mexico",
  "Minalin",
  "Porac",
  "San Luis",
  "San Simon",
  "Santa Ana",
  "Santa Rita",
  "Santo Tomas",
  "Sasmuan",
] as const;

export type PublicPropertyArea = (typeof PUBLIC_PROPERTY_AREAS)[number];

/** Parsed, typed property filters used by the API and reflected in frontend URLs. */
export interface PropertySearchFilters {
  keyword?: string;
  propertyId?: string;
  /** Exact, allowlisted public city/municipality selected from the discovery map. */
  area?: PublicPropertyArea;
  location?: string;
  propertyType?: PropertyType;
  purpose?: ListingPurpose;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minLotArea?: number;
  minFloorArea?: number;
  featured?: boolean;
}

export interface PropertySearchRequest extends PropertySearchFilters {
  sort: PropertySort;
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Body of `GET /api/v1/properties`. */
export interface PropertySearchResponse {
  items: PublicPropertySummary[];
  pagination: PaginationMeta;
  appliedFilters: PropertySearchFilters;
  sort: PropertySort;
}

/** The deliberately small public shape needed by a map marker and preview. */
export type PublicPropertyMapItem = Pick<
  PublicPropertySummary,
  | "id"
  | "propertyId"
  | "slug"
  | "title"
  | "purpose"
  | "propertyType"
  | "availability"
  | "price"
  | "location"
  | "specifications"
  | "coverMedia"
>;

/** Body of the lazy `GET /api/v1/properties/map` request. */
export interface PropertyMapResponse {
  items: PublicPropertyMapItem[];
  /** All published records matching the filters, including records without a pin. */
  matchingTotal: number;
  /** Matching records with an explicitly approved, public map point. */
  mappableTotal: number;
  returned: number;
  truncated: boolean;
  appliedFilters: PropertySearchFilters;
}

/** Body of `GET /api/v1/properties/facets`. */
export interface PropertyFacetsResponse {
  locations: string[];
  propertyTypes: PropertyType[];
  priceRange: {
    min: number | null;
    max: number | null;
    currency: PropertyCurrency;
  };
}

export const INQUIRY_TYPES = ["general", "property", "viewing", "selling"] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const INQUIRY_SOURCES = [
  "contact-page",
  "property-detail",
  "viewing-page",
  "sell-page",
] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

/** Body accepted by `POST /api/v1/inquiries`. */
export interface CreateInquiryRequest {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  subject?: string;
  message: string;
  privacyConsent: true;
  /** Honeypot field. Legitimate clients leave it empty. */
  website?: string;
}

/** Body returned by `POST /api/v1/inquiries`. */
export interface CreateInquiryResponse {
  inquiryId: string;
  status: "received";
  message: string;
  createdAt: string;
}
