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
  /** Optional non-secret deployment identifier supplied by the release platform. */
  buildId?: string;
}

/** Body of `GET /api/v1/health/ready`. */
export interface ReadinessResponse {
  status: "ready" | "not-ready";
  service: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  environment: Environment;
  database: DatabaseStatus;
  buildId?: string;
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

/** Staff roles owned by the RC Premier Properties application, never by Auth0 claims. */
export const STAFF_ROLES = ["admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Deny-by-default capabilities checked by backend authorization middleware. */
export const AUTH_PERMISSIONS = [
  "property:read-private",
  "property:write",
  "property:publish",
  "property:change-availability",
  "inquiry:read",
  "inquiry:update",
  "audit:read",
  "staff:manage",
] as const;

export type AuthPermission = (typeof AUTH_PERMISSIONS)[number];

/** Optional query accepted by `GET /api/v1/auth/login`. */
export interface StartLoginRequest {
  /** Exact allowlisted frontend URL to receive the browser after login. */
  returnTo?: string;
}

export interface AuthenticatedStaff {
  id: string;
  displayName: string;
  email: string;
  role: StaffRole;
}

/** Body returned by `GET /api/v1/auth/session`. */
export interface CurrentSessionResponse {
  authenticated: true;
  staff: AuthenticatedStaff;
  permissions: AuthPermission[];
  /** Session-bound token required in `X-CSRF-Token` on authenticated writes. */
  csrfToken: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
}

/** Body returned by the idempotent `POST /api/v1/auth/logout`. */
export interface LogoutResponse {
  status: "logged-out";
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

/** Property types approved for the public residential-sales experience. */
export const RESIDENTIAL_SALE_PROPERTY_TYPES = [
  "house-and-lot",
  "townhouse",
  "lot",
] as const satisfies readonly PropertyType[];

export type ResidentialSalePropertyType =
  (typeof RESIDENTIAL_SALE_PROPERTY_TYPES)[number];

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
/** The production administration write boundary is sales-only. */
export const ADMIN_LISTING_PURPOSES = ["sale"] as const;
export type AdminListingPurpose = (typeof ADMIN_LISTING_PURPOSES)[number];

export const PROPERTY_AVAILABILITY = ["available", "reserved", "sold"] as const;
export type PropertyAvailability = (typeof PROPERTY_AVAILABILITY)[number];

export const PROPERTY_PUBLICATION_STATUSES = [
  "draft",
  "published",
  "unpublished",
  "archived",
] as const;

export type PropertyPublicationStatus = (typeof PROPERTY_PUBLICATION_STATUSES)[number];

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

export const PROPERTY_MEDIA_KINDS = ["image", "video", "floor-plan"] as const;
export type PropertyMediaKind = (typeof PROPERTY_MEDIA_KINDS)[number];

export const PROPERTY_MEDIA_SOURCES = ["production", "development-sample"] as const;
export type PropertyMediaSource = (typeof PROPERTY_MEDIA_SOURCES)[number];

/** Deliberately bounded so a property document and admin form stay practical. */
export const MAX_PROPERTY_IMAGES = 24;
export const MAX_PROPERTY_IMAGE_BYTES = 12 * 1024 * 1024;

export interface UploadPropertyImageRequest {
  expectedVersion: number;
  alt: string;
  caption?: string;
}

/**
 * Public media metadata. URLs stay optional while the media provider is intentionally
 * unselected; the frontend renders an explicit replacement placeholder when absent.
 */
export interface PublicPropertyMedia {
  /** Stable identifier used by cover selection and admin reordering. */
  id?: string;
  kind: PropertyMediaKind;
  url?: string;
  alt: string;
  caption?: string;
  /** Legacy records may omit this; newly managed media always supplies it. */
  source?: PropertyMediaSource;
  /** Public provenance page required for development samples. */
  sourceUrl?: string;
  attribution?: string;
  /** Non-destructive subject position used when a fixed-ratio crop is necessary. */
  focalPoint?: { x: number; y: number };
}

/** Ordered image metadata used by both uploaded and provider-backed production media. */
export interface AdminPropertyMediaInput {
  id: string;
  kind: "image";
  url: string;
  alt: string;
  caption?: string;
  source: PropertyMediaSource;
  sourceUrl?: string;
  attribution?: string;
  focalPoint?: { x: number; y: number };
}

/** Body accepted by `PUT /api/v1/admin/properties/:id/media`. */
export interface UpdatePropertyMediaRequest {
  expectedVersion: number;
  /** Array order is the public display order. */
  media: AdminPropertyMediaInput[];
  /** Required when `media` is non-empty and omitted when it is empty. */
  coverMediaId?: string;
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

/** Content fields accepted by the Phase 3A draft create/edit endpoints. */
export const ADMIN_PROPERTY_CONTENT_FIELDS = [
  "propertyId",
  "slug",
  "title",
  "purpose",
  "propertyType",
  "featured",
  "price",
  "location",
  "specifications",
  "shortDescription",
  "description",
  "highlights",
  "amenities",
  "features",
] as const;

export type AdminPropertyContentField = (typeof ADMIN_PROPERTY_CONTENT_FIELDS)[number];

export interface AdminPropertyPriceInput {
  amount: number;
  negotiable: boolean;
}

/** Exact internal coordinates visible only through authorized administration APIs. */
export interface AdminPropertyCoordinates {
  latitude: number;
  longitude: number;
}

export interface AdminPropertyLocationInput {
  province: string;
  city: string;
  barangay?: string;
  development?: string;
  publicPrecision: PublicLocationPrecision;
  /** Private operational address. Never serialized by a public property endpoint. */
  privateAddress?: string;
  /** Verified private point. Never used as a fallback for the public map point. */
  coordinates?: AdminPropertyCoordinates;
  /** Independently reviewed point intentionally approved for public disclosure. */
  publicPoint?: PublicMapPoint;
}

export type AdminPropertyLocationSummary = Pick<
  AdminPropertyLocationInput,
  "province" | "city" | "barangay" | "development" | "publicPrecision"
>;

export interface AdminPropertyContentInput {
  propertyId: string;
  slug: string;
  title: string;
  purpose: AdminListingPurpose;
  propertyType: PropertyType;
  featured: boolean;
  price: AdminPropertyPriceInput;
  location: AdminPropertyLocationInput;
  specifications: PublicPropertySpecifications;
  shortDescription: string;
  description: string;
  highlights: string[];
  amenities: string[];
  features: string[];
}

/** Body accepted by `POST /api/v1/admin/properties`. */
export type CreateDraftPropertyRequest = AdminPropertyContentInput;

/** Body accepted by `PATCH /api/v1/admin/properties/:id`. */
export type UpdateDraftPropertyRequest = Partial<AdminPropertyContentInput> & {
  /** Version returned by the most recent private read. */
  expectedVersion: number;
};

/** Body accepted by publication and archive transition endpoints. */
export interface AdminPropertyTransitionRequest {
  expectedVersion: number;
}

/** Body accepted by `PATCH /api/v1/admin/properties/:id/availability`. */
export interface AdminPropertyAvailabilityRequest {
  expectedVersion: number;
  availability: PropertyAvailability;
}

export interface AdminPropertySummary {
  id: string;
  propertyId: string;
  slug: string;
  title: string;
  purpose: ListingPurpose;
  propertyType: PropertyType;
  availability: PropertyAvailability;
  publicationStatus: PropertyPublicationStatus;
  featured: boolean;
  price: {
    amount: number;
    currency: PropertyCurrency;
    negotiable: boolean;
  };
  /** Deliberately excludes private coordinates/address from collection responses. */
  location: AdminPropertyLocationSummary;
  shortDescription: string;
  publicationReadiness: {
    ready: boolean;
    missing: string[];
  };
  /** Optimistic-concurrency token. Send it back with every mutation. */
  version: number;
  updatedAt: string;
}

export interface AdminPropertyDetail extends Omit<AdminPropertySummary, "location"> {
  /** Full location authoring state, returned only by protected detail/mutation routes. */
  location: AdminPropertyLocationInput;
  specifications: PublicPropertySpecifications;
  description: string;
  highlights: string[];
  amenities: string[];
  features: string[];
  coverMedia?: PublicPropertyMedia;
  gallery: PublicPropertyMedia[];
  createdAt: string;
  publishedAt?: string;
}

export interface AdminPropertyListRequest {
  query?: string;
  publicationStatus?: PropertyPublicationStatus;
  availability?: PropertyAvailability;
  page: number;
  limit: number;
}

/** Body returned by `GET /api/v1/admin/properties`. */
export interface AdminPropertyListResponse {
  items: AdminPropertySummary[];
  pagination: PaginationMeta;
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
  availability?: PropertyAvailability;
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
  /** Published-inventory counts keyed by the same public location labels. */
  locationCounts?: Array<{ location: string; count: number }>;
  propertyTypes: PropertyType[];
  priceRange: {
    min: number | null;
    max: number | null;
    currency: PropertyCurrency;
  };
}

/** Body of `GET /api/v1/properties/:slug/related`. */
export interface RelatedPropertiesResponse {
  items: PublicPropertySummary[];
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

/** Lightweight staff workflow. Spam is quarantined outside the active queue. */
export const INQUIRY_WORKFLOW_STATUSES = [
  "new",
  "in-progress",
  "viewing-scheduled",
  "closed",
  "lost",
] as const;
export type InquiryWorkflowStatus = (typeof INQUIRY_WORKFLOW_STATUSES)[number];

export const INQUIRY_STATUSES = [...INQUIRY_WORKFLOW_STATUSES, "spam"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** The appointment lifecycle embedded only on viewing inquiries. */
export const VIEWING_REQUEST_STATUSES = [
  "requested",
  "confirmed",
  "reschedule-requested",
  "completed",
  "canceled",
] as const;
export type ViewingRequestStatus = (typeof VIEWING_REQUEST_STATUSES)[number];

/** Staff actions intentionally exclude the initial customer-created state. */
export const VIEWING_STAFF_TRANSITION_STATUSES = [
  "confirmed",
  "reschedule-requested",
  "completed",
  "canceled",
] as const;
export type ViewingStaffTransitionStatus =
  (typeof VIEWING_STAFF_TRANSITION_STATUSES)[number];

/** Requested viewing times are interpreted in Philippine local time. */
export const BUSINESS_TIME_ZONE = "Asia/Manila" as const;
export const VIEWING_TIME_ZONE = BUSINESS_TIME_ZONE;

export const ADMIN_INQUIRY_QUEUES = ["active", "spam", "archived", "all"] as const;
export type AdminInquiryQueue = (typeof ADMIN_INQUIRY_QUEUES)[number];

/** Body accepted by `POST /api/v1/inquiries`. */
export interface CreateInquiryRequest {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  subject?: string;
  /** Optional only for a structured viewing request. */
  message?: string;
  /** Required when `inquiryType` is `viewing`; `YYYY-MM-DD` in Philippine time. */
  requestedDate?: string;
  /** Required when `inquiryType` is `viewing`; 24-hour `HH:mm` Philippine time. */
  requestedTime?: string;
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

export interface AdminInquiryStatusHistoryEntry {
  fromStatus?: InquiryStatus;
  toStatus: InquiryStatus;
  changedAt: string;
}

export interface AdminViewingStatusHistoryEntry {
  fromStatus?: ViewingRequestStatus;
  toStatus: ViewingRequestStatus;
  requestedDate: string;
  requestedTime: string;
  changedAt: string;
}

export interface AdminViewingRequest {
  status: ViewingRequestStatus;
  requestedDate: string;
  requestedTime: string;
  statusHistory: AdminViewingStatusHistoryEntry[];
}

export interface AdminInquiryNote {
  id: string;
  note: string;
  createdAt: string;
}

/** Private list shape: enough personal data to identify a lead, without message bodies. */
export interface AdminInquirySummary {
  id: string;
  name: string;
  email: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  subject?: string;
  status: InquiryStatus;
  viewingRequest?: Omit<AdminViewingRequest, "statusHistory">;
  notification: AdminInquiryNotification;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type AdminInquiryNotification =
  | {
      /** Legacy record created before durable notification tracking existed. */
      status: "untracked";
    }
  | {
      status:
        "pending" | "sending" | "retry-pending" | "delivered" | "terminal-failure";
      attempts: number;
      nextAttemptAt?: string;
      lastAttemptAt?: string;
      deliveredAt?: string;
      lastErrorCode?: string;
    };

export interface AdminInquiryDetail extends AdminInquirySummary {
  phone?: string;
  message?: string;
  privacyConsentAt: string;
  internalNotes: AdminInquiryNote[];
  statusHistory: AdminInquiryStatusHistoryEntry[];
  viewingRequest?: AdminViewingRequest;
}

export interface AdminInquiryListRequest {
  query?: string;
  status?: InquiryStatus;
  inquiryType?: InquiryType;
  source?: InquirySource;
  propertyId?: string;
  viewingStatus?: ViewingRequestStatus;
  queue: AdminInquiryQueue;
  page: number;
  limit: number;
}

export interface AdminInquiryListResponse {
  items: AdminInquirySummary[];
  pagination: PaginationMeta;
}

export interface AdminInquirySearchRequest {
  query: string;
  limit: number;
}

/** Value-minimized result used only by the cross-admin search surface. */
export interface AdminInquirySearchItem {
  id: string;
  inquiryType: InquiryType;
  status: InquiryStatus;
  propertyId?: string;
}

export interface AdminInquirySearchResponse {
  items: AdminInquirySearchItem[];
}

export interface UpdateInquiryStatusRequest {
  status: InquiryWorkflowStatus;
  expectedVersion: number;
}

export interface UpdateViewingRequestRequest {
  status: ViewingStaffTransitionStatus;
  requestedDate: string;
  requestedTime: string;
  expectedVersion: number;
}

export interface AddInquiryNoteRequest {
  note: string;
  expectedVersion: number;
}

export interface AdminInquiryTransitionRequest {
  expectedVersion: number;
}

export const AUDIT_ACTIONS = [
  "auth.login.succeeded",
  "auth.login.failed",
  "auth.logout.succeeded",
  "auth.session.revoked",
  "auth.access.denied",
  "property.created",
  "property.edited",
  "property.media-updated",
  "property.published",
  "property.unpublished",
  "property.availability-changed",
  "property.reserved",
  "property.sold",
  "property.archived",
  "property.restored",
  "inquiry.status-changed",
  "inquiry.marked-spam",
  "inquiry.restored-from-spam",
  "inquiry.note-added",
  "inquiry.archived",
  "inquiry.restored",
  "viewing.confirmed",
  "viewing.reschedule-requested",
  "viewing.completed",
  "viewing.canceled",
  "staff.provisioned",
  "staff.deactivated",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_OUTCOMES = ["succeeded", "failed", "denied"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const AUDIT_ENTITY_TYPES = [
  "authentication",
  "property",
  "inquiry",
  "session",
  "staff-identity",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const STAFF_STATUSES = ["active", "disabled"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export interface AdminDashboardResponse {
  properties: {
    published: number;
    draft: number;
    unpublished: number;
    available: number;
    reserved: number;
    sold: number;
  };
  inquiries: {
    active: number;
    new: number;
  };
  notifications: {
    retryPending: number;
    terminalFailure: number;
  };
  upcomingViewings: AdminViewingCalendarItem[];
  upcomingViewingCount: number;
  mediaCleanupDebtCount: number;
  generatedAt: string;
}

export interface AdminViewingCalendarItem {
  inquiryId: string;
  propertyId?: string;
  status: ViewingRequestStatus;
  requestedDate: string;
  requestedTime: string;
}

export interface AdminViewingCalendarResponse {
  items: AdminViewingCalendarItem[];
  start: string;
  end: string;
  pagination: PaginationMeta;
  truncated: boolean;
}

export interface AdminAuditEventSummary {
  id: string;
  actorStaffIdentityId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  outcome: AuditOutcome;
  requestId: string;
  occurredAt: string;
}

export interface AdminAuditListRequest {
  action?: AuditAction;
  entityType?: AuditEntityType;
  outcome?: AuditOutcome;
  actorStaffIdentityId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface AdminAuditListResponse {
  items: AdminAuditEventSummary[];
  pagination: PaginationMeta;
}

export interface AdminStaffSummary {
  id: string;
  displayName: string;
  email: string;
  role: StaffRole | null;
  status: StaffStatus;
  authorizationVersion: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStaffListRequest {
  query?: string;
  status?: StaffStatus;
  page: number;
  limit: number;
}

export interface AdminStaffListResponse {
  items: AdminStaffSummary[];
  pagination: PaginationMeta;
}
