import type {
  ListingPurpose,
  PropertyAvailability,
  PropertyMediaKind,
  PropertyType,
  PublicLocationPrecision,
  PublicMapPoint,
  PropertyMapResponse,
  PublicPropertyDetail,
  PublicPropertySummary,
} from "@rc/shared";

export const PROPERTY_PUBLICATION_STATUSES = [
  "draft",
  "pending",
  "published",
  "archived",
] as const;

export type PropertyPublicationStatus = (typeof PROPERTY_PUBLICATION_STATUSES)[number];

export interface PropertyMediaEntity {
  kind: PropertyMediaKind;
  url?: string;
  alt: string;
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
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPropertyRecord extends Omit<
  PropertyEntity,
  "publicationStatus" | "internalNotes" | "ownerReference" | "location"
> {
  _id: unknown;
  location: Omit<PropertyLocationEntity, "privateAddress" | "coordinates">;
}

export interface PropertyService {
  search(
    request: import("@rc/shared").PropertySearchRequest,
  ): Promise<import("@rc/shared").PropertySearchResponse>;
  map(
    request: import("@rc/shared").PropertySearchRequest,
  ): Promise<PropertyMapResponse>;
  findPublishedBySlug(slug: string): Promise<PublicPropertyDetail | null>;
  getFacets(): Promise<import("@rc/shared").PropertyFacetsResponse>;
}

export type PropertySummaryMapper = (
  record: PublicPropertyRecord,
) => PublicPropertySummary;
