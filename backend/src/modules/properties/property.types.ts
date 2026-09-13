import type {
  AdminPropertyDetail,
  AdminPropertyAvailabilityRequest,
  AdminPropertyFeaturedRequest,
  AdminPropertyListRequest,
  AdminPropertyListResponse,
  AdminPropertyTransitionRequest,
  AdminPropertyMediaInput,
  CreateDraftPropertyRequest,
  ListingPurpose,
  PropertyAvailability,
  PropertyMediaKind,
  PropertyMediaSource,
  PropertyPublicationStatus,
  PropertyType,
  PublicLocationPrecision,
  PublicMapPoint,
  PropertyMapResponse,
  PublicPropertyDetail,
  PublicPropertySummary,
  RelatedPropertiesResponse,
  UpdateDraftPropertyRequest,
  UpdatePropertyMediaRequest,
  UploadPropertyImageRequest,
} from "@rc/shared";
import type { SecurityAuditEventInput } from "../auth/auth.types.js";

export interface PropertyMediaEntity {
  id?: string;
  kind: PropertyMediaKind;
  url?: string;
  alt: string;
  caption?: string;
  source?: PropertyMediaSource;
  sourceUrl?: string;
  attribution?: string;
  focalPoint?: { x: number; y: number };
}

export interface PropertyLocationEntity {
  region?: string;
  province: string;
  city: string;
  barangay?: string;
  development?: string;
  /** Optional for legacy records; public serialization falls back to `city-only`. */
  publicPrecision?: PublicLocationPrecision;
  /**
   * Independently approved public map point. Never populate this automatically from
   * `coordinates`; non-exact precision requires an appropriately generalized point.
   */
  publicPoint?: PublicMapPoint;
  /** Never selected by a public property query. */
  privateAddress?: string;
  /** Never selected by a public property query. */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PropertySpecificationsEntity {
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  lotAreaSqm?: number;
  floorAreaSqm?: number;
  storeys?: number;
  furnishing?: string;
}

/** The persistence shape. Public serialization is deliberately handled separately. */
export interface PropertyEntity {
  propertyId: string;
  slug: string;
  title: string;
  purpose: ListingPurpose;
  propertyType: PropertyType;
  availability: PropertyAvailability;
  publicationStatus: PropertyPublicationStatus;
  featured: boolean;
  featuredOrder?: number;
  price: {
    amount: number;
    currency: "PHP";
    negotiable: boolean;
  };
  location: PropertyLocationEntity;
  specifications: PropertySpecificationsEntity;
  shortDescription: string;
  description: string;
  highlights: string[];
  amenities: string[];
  features: string[];
  coverMedia?: PropertyMediaEntity;
  gallery: PropertyMediaEntity[];
  /** Internal-only operational notes; excluded at schema and query level. */
  internalNotes?: string;
  /** Internal-only owner reference; excluded at schema and query level. */
  ownerReference?: string;
  publishedAt?: Date;
  /** Safe private state to restore after an archive action. */
  archiveRestoreStatus?: "draft" | "unpublished";
  /** Missing only on records created before optimistic concurrency was enabled. */
  __v?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPropertyRecord extends Omit<
  PropertyEntity,
  "publicationStatus" | "internalNotes" | "ownerReference" | "location" | "publishedAt"
> {
  _id: unknown;
  location: Omit<PropertyLocationEntity, "privateAddress" | "coordinates">;
  publishedAt: Date;
}

export interface AdminPropertyRecord extends PropertyEntity {
  _id: unknown;
}

export interface PropertyContentPersistenceInput extends Omit<
  CreateDraftPropertyRequest,
  "price"
> {
  price: CreateDraftPropertyRequest["price"] & { currency: "PHP" };
}

export interface DraftPropertyPersistenceInput extends PropertyContentPersistenceInput {
  availability: "available";
  publicationStatus: "draft";
}

export interface PropertyAdminRepository {
  list(
    request: AdminPropertyListRequest,
  ): Promise<{ records: AdminPropertyRecord[]; total: number }>;
  findById(id: string): Promise<AdminPropertyRecord | null>;
  /** True when any property metadata still points at this storage object. */
  isMediaReferenced(objectReference: string): Promise<boolean>;
  createDraft(input: DraftPropertyPersistenceInput): Promise<AdminPropertyRecord>;
  updateDraft(
    id: string,
    expectedVersion: number,
    input: Partial<PropertyContentPersistenceInput>,
  ): Promise<AdminPropertyRecord | null>;
  updateMedia(
    id: string,
    expectedVersion: number,
    media: AdminPropertyMediaInput[],
    coverMedia?: AdminPropertyMediaInput,
  ): Promise<AdminPropertyRecord | null>;
  updateFeatured(
    id: string,
    expectedVersion: number,
    featured: boolean,
    featuredOrder?: number,
  ): Promise<AdminPropertyRecord | null>;
  transition(
    id: string,
    expectedVersion: number,
    currentPublicationStatus: PropertyPublicationStatus,
    update: {
      publicationStatus?: PropertyPublicationStatus;
      availability?: PropertyAvailability;
      publishedAt?: Date;
      archiveRestoreStatus?: "draft" | "unpublished";
      clearArchiveRestoreStatus?: boolean;
    },
  ): Promise<AdminPropertyRecord | null>;
}

export interface PropertyAuditRecorder {
  recordAudit(event: SecurityAuditEventInput): Promise<void>;
}

export interface PropertyMutationContext {
  actorStaffIdentityId: string;
  requestId: string;
  occurredAt?: Date;
}

export interface AdminPropertyService {
  listPrivate(request: AdminPropertyListRequest): Promise<AdminPropertyListResponse>;
  findPrivateById(id: string): Promise<AdminPropertyDetail | null>;
  createDraft(
    input: CreateDraftPropertyRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail>;
  updateDraft(
    id: string,
    input: UpdateDraftPropertyRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  updateMedia(
    id: string,
    input: UpdatePropertyMediaRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  uploadImage?(
    id: string,
    input: UploadPropertyImageRequest,
    bytes: Buffer,
    declaredMimeType: string | undefined,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  publish(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  unpublish(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  archive(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  restore(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  changeAvailability(
    id: string,
    input: AdminPropertyAvailabilityRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
  updateFeatured(
    id: string,
    input: AdminPropertyFeaturedRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null>;
}

export interface PropertyService {
  search(
    request: import("@rc/shared").PropertySearchRequest,
  ): Promise<import("@rc/shared").PropertySearchResponse>;
  map(
    request: import("@rc/shared").PropertySearchRequest,
  ): Promise<PropertyMapResponse>;
  findPublishedBySlug(slug: string): Promise<PublicPropertyDetail | null>;
  related(slug: string): Promise<RelatedPropertiesResponse | null>;
  getFacets(): Promise<import("@rc/shared").PropertyFacetsResponse>;
}

export type PropertySummaryMapper = (
  record: PublicPropertyRecord,
) => PublicPropertySummary;
