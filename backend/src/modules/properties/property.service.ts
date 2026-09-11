import {
  ADMIN_PROPERTY_CONTENT_FIELDS,
  MAX_PROPERTY_IMAGES,
  PUBLIC_PROPERTY_AREAS,
  PUBLIC_LOCATION_PRECISIONS,
  RESIDENTIAL_SALE_PROPERTY_TYPES,
  type AdminPropertyContentField,
  type AdminPropertyDetail,
  type AdminPropertyAvailabilityRequest,
  type AdminPropertyFeaturedRequest,
  type AdminPropertyListRequest,
  type AdminPropertyListResponse,
  type AdminPropertySummary,
  type AdminPropertyTransitionRequest,
  type AdminPropertyMediaInput,
  type CreateDraftPropertyRequest,
  type PropertyMapResponse,
  type PropertyFacetsResponse,
  type PropertySearchRequest,
  type PropertySearchResponse,
  type PropertySort,
  type PublicLocationPrecision,
  type PublicMapPoint,
  type PublicPropertyMapItem,
  type PublicPropertyDetail,
  type PublicPropertyLocation,
  type PublicPropertySummary,
  type RelatedPropertiesResponse,
  type UpdateDraftPropertyRequest,
  type UpdatePropertyMediaRequest,
  type UploadPropertyImageRequest,
} from "@rc/shared";
import type { Model, QueryFilter, SortOrder } from "mongoose";
import { HttpError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";
import { errorIdentity, operationalLogger } from "../../lib/operational-logger.js";
import { mongooseAuthStore } from "../auth/auth.store.js";
import { PropertyModel } from "./property.model.js";
import { inspectPropertyImage } from "./property-media.validation.js";
import {
  propertyMediaStorage,
  propertyMediaStorageErrorCode,
  type PropertyMediaStorage,
} from "./property-media.storage.js";
import {
  mongooseMediaCleanupDebtRecorder,
  type MediaCleanupDebtRecorder,
  type MediaCleanupReason,
} from "./property-media-cleanup.model.js";
import type {
  AdminPropertyRecord,
  AdminPropertyService,
  DraftPropertyPersistenceInput,
  PropertyAdminRepository,
  PropertyAuditRecorder,
  PropertyContentPersistenceInput,
  PropertyEntity,
  PropertyMutationContext,
  PropertyService,
  PublicPropertyRecord,
} from "./property.types.js";

const PUBLIC_PROPERTY_SUMMARY_FIELDS = [
  "_id",
  "propertyId",
  "slug",
  "title",
  "purpose",
  "propertyType",
  "availability",
  "featured",
  "price",
  "location.province",
  "location.city",
  "location.barangay",
  "location.development",
  "location.publicPrecision",
  "location.publicPoint",
  "specifications",
  "shortDescription",
  "coverMedia",
  "publishedAt",
] as const;

const PUBLIC_PROPERTY_SUMMARY_PROJECTION = PUBLIC_PROPERTY_SUMMARY_FIELDS.join(" ");

const PUBLIC_PROPERTY_MAP_PROJECTION = [
  "_id",
  "propertyId",
  "slug",
  "title",
  "purpose",
  "propertyType",
  "availability",
  "price",
  "location.province",
  "location.city",
  "location.barangay",
  "location.development",
  "location.publicPrecision",
  "location.publicPoint",
  "specifications",
  "coverMedia",
].join(" ");

const PUBLIC_PROPERTY_DETAIL_PROJECTION = [
  ...PUBLIC_PROPERTY_SUMMARY_FIELDS,
  "description",
  "highlights",
  "amenities",
  "features",
  "gallery",
  "updatedAt",
].join(" ");

const ADMIN_PROPERTY_PROJECTION = [
  "_id",
  "propertyId",
  "slug",
  "title",
  "purpose",
  "propertyType",
  "availability",
  "publicationStatus",
  "featured",
  "featuredOrder",
  "price",
  "location.province",
  "location.city",
  "location.barangay",
  "location.development",
  "location.publicPrecision",
  "specifications",
  "shortDescription",
  "description",
  "highlights",
  "amenities",
  "features",
  "coverMedia",
  "gallery",
  "publishedAt",
  "archiveRestoreStatus",
  "__v",
  "createdAt",
  "updatedAt",
].join(" ");

const ADMIN_PROPERTY_DETAIL_PROJECTION = [
  ADMIN_PROPERTY_PROJECTION,
  "location.publicPoint",
  "+location.privateAddress",
  "+location.coordinates",
].join(" ");

const MAP_RESULT_LIMIT = 200;
const BARANGAY_PUBLIC_PRECISIONS: PublicLocationPrecision[] = [
  "exact",
  "approximate",
  "subdivision",
  "barangay-area",
];
const DEVELOPMENT_PUBLIC_PRECISIONS: PublicLocationPrecision[] = [
  "exact",
  "approximate",
  "subdivision",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function publicTextLocationMatch(
  field: "location.barangay" | "location.development",
  value: RegExp,
  publicPrecisions: PublicLocationPrecision[],
): QueryFilter<PropertyEntity> {
  return {
    $and: [
      { "location.publicPrecision": { $in: publicPrecisions } },
      { [field]: value },
    ],
  };
}

function cityProvinceFacetMatch(
  value: string,
): QueryFilter<PropertyEntity> | undefined {
  const parts = value.split(",");
  if (parts.length !== 2) return undefined;

  const [city, province] = parts.map((part) => part.trim());
  if (!city || !province) return undefined;

  return {
    $and: [
      { "location.city": new RegExp(`^${escapeRegex(city)}$`, "i") },
      { "location.province": new RegExp(`^${escapeRegex(province)}$`, "i") },
    ],
  };
}

export function buildPublishedPropertyFilter(
  request: PropertySearchRequest,
): QueryFilter<PropertyEntity> {
  const filter: QueryFilter<PropertyEntity> = {
    publicationStatus: "published",
    purpose: "sale",
    propertyType: { $in: RESIDENTIAL_SALE_PROPERTY_TYPES },
  };

  if (request.propertyId) filter.propertyId = request.propertyId.toUpperCase();
  if (request.area) filter["location.city"] = request.area;
  if (request.propertyType) filter.propertyType = request.propertyType;
  if (request.availability) filter.availability = request.availability;
  if (request.purpose === "rent") filter._id = { $exists: false };
  if (request.featured !== undefined) filter.featured = request.featured;
  if (request.featured === true) {
    if (request.availability === "sold") {
      filter._id = { $exists: false };
    } else if (!request.availability) {
      filter.availability = { $ne: "sold" };
    }
  }

  if (request.minPrice !== undefined || request.maxPrice !== undefined) {
    filter["price.amount"] = {
      ...(request.minPrice !== undefined ? { $gte: request.minPrice } : {}),
      ...(request.maxPrice !== undefined ? { $lte: request.maxPrice } : {}),
    };
  }
  if (request.bedrooms !== undefined) {
    filter["specifications.bedrooms"] = { $gte: request.bedrooms };
  }
  if (request.bathrooms !== undefined) {
    filter["specifications.bathrooms"] = { $gte: request.bathrooms };
  }
  if (request.minLotArea !== undefined) {
    filter["specifications.lotAreaSqm"] = { $gte: request.minLotArea };
  }
  if (request.minFloorArea !== undefined) {
    filter["specifications.floorAreaSqm"] = { $gte: request.minFloorArea };
  }

  const clauses: QueryFilter<PropertyEntity>[] = [];
  if (request.keyword) {
    const keyword = new RegExp(escapeRegex(request.keyword), "i");
    clauses.push({
      $or: [
        { title: keyword },
        { shortDescription: keyword },
        { propertyId: keyword },
        publicTextLocationMatch(
          "location.development",
          keyword,
          DEVELOPMENT_PUBLIC_PRECISIONS,
        ),
      ],
    });
  }
  if (request.location) {
    const location = new RegExp(escapeRegex(request.location), "i");
    const facetMatch = cityProvinceFacetMatch(request.location);
    clauses.push({
      $or: [
        { "location.province": location },
        { "location.city": location },
        publicTextLocationMatch(
          "location.barangay",
          location,
          BARANGAY_PUBLIC_PRECISIONS,
        ),
        publicTextLocationMatch(
          "location.development",
          location,
          DEVELOPMENT_PUBLIC_PRECISIONS,
        ),
        ...(facetMatch ? [facetMatch] : []),
      ],
    });
  }
  if (clauses.length > 0) filter.$and = clauses;

  return filter;
}

export function buildPublishedPropertyDetailFilter(
  slug: string,
): QueryFilter<PropertyEntity> {
  return {
    publicationStatus: "published",
    purpose: "sale",
    propertyType: { $in: RESIDENTIAL_SALE_PROPERTY_TYPES },
    slug,
  };
}

function sortFor(sort: PropertySort, featured = false): Record<string, SortOrder> {
  if (featured) return { featuredOrder: -1, publishedAt: -1, _id: -1 };
  if (sort === "price-asc") return { "price.amount": 1, _id: 1 };
  if (sort === "price-desc") return { "price.amount": -1, _id: -1 };
  return { publishedAt: -1, _id: -1 };
}

function validPublicPrecision(
  value: PublicLocationPrecision | undefined,
): value is PublicLocationPrecision {
  return Boolean(value && PUBLIC_LOCATION_PRECISIONS.includes(value));
}

function validPublicPoint(point: PublicMapPoint | undefined): point is PublicMapPoint {
  if (
    !point ||
    point.type !== "Point" ||
    !Array.isArray(point.coordinates) ||
    point.coordinates.length !== 2
  ) {
    return false;
  }
  const [longitude, latitude] = point.coordinates;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function validPrivateCoordinates(
  coordinates: AdminPropertyRecord["location"]["coordinates"],
): coordinates is { latitude: number; longitude: number } {
  return Boolean(
    coordinates &&
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180,
  );
}

function publicLocation(record: PublicPropertyRecord): PublicPropertyLocation {
  const configuredPrecision = record.location.publicPrecision;
  const configuredPoint = record.location.publicPoint;
  const hasExplicitPrecision = validPublicPrecision(configuredPrecision);
  const publicPrecision = hasExplicitPrecision ? configuredPrecision : "city-only";
  const revealsBarangay = publicPrecision !== "city-only";
  const revealsDevelopment =
    publicPrecision === "exact" ||
    publicPrecision === "approximate" ||
    publicPrecision === "subdivision";
  const publicPoint =
    hasExplicitPrecision && validPublicPoint(configuredPoint)
      ? {
          type: "Point" as const,
          coordinates: [
            configuredPoint.coordinates[0],
            configuredPoint.coordinates[1],
          ] as [longitude: number, latitude: number],
        }
      : undefined;

  return {
    province: record.location.province,
    city: record.location.city,
    ...(revealsBarangay && record.location.barangay
      ? { barangay: record.location.barangay }
      : {}),
    ...(revealsDevelopment && record.location.development
      ? { development: record.location.development }
      : {}),
    publicPrecision,
    ...(publicPoint ? { publicPoint } : {}),
    disclosure: publicPrecision === "exact" ? "exact" : "general-area",
  };
}

export function toPublicPropertySummary(
  record: PublicPropertyRecord,
): PublicPropertySummary {
  return {
    id: String(record._id),
    propertyId: record.propertyId,
    slug: record.slug,
    title: record.title,
    purpose: record.purpose,
    propertyType: record.propertyType,
    availability: record.availability,
    featured: record.featured ?? false,
    price: record.price,
    location: publicLocation(record),
    specifications: record.specifications,
    shortDescription: record.shortDescription,
    ...(record.coverMedia ? { coverMedia: record.coverMedia } : {}),
    publishedAt: record.publishedAt.toISOString(),
  };
}

export function toPublicPropertyMapItem(
  record: PublicPropertyRecord,
): PublicPropertyMapItem | undefined {
  const location = publicLocation(record);
  if (!location.publicPoint) return undefined;

  return {
    id: String(record._id),
    propertyId: record.propertyId,
    slug: record.slug,
    title: record.title,
    purpose: record.purpose,
    propertyType: record.propertyType,
    availability: record.availability,
    price: record.price,
    location,
    specifications: record.specifications,
    ...(record.coverMedia ? { coverMedia: record.coverMedia } : {}),
  };
}

export function toPublicPropertyDetail(
  record: PublicPropertyRecord,
): PublicPropertyDetail {
  return {
    ...toPublicPropertySummary(record),
    description: record.description,
    highlights: record.highlights,
    amenities: record.amenities,
    features: record.features,
    gallery: record.gallery,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAdminPropertySummary(
  record: AdminPropertyRecord,
): AdminPropertySummary {
  const missing: string[] = [];
  if (!record.propertyId?.trim()) missing.push("property number");
  if (!record.slug?.trim()) missing.push("URL slug");
  if (!record.title?.trim()) missing.push("title");
  if (record.purpose !== "sale") missing.push("sale purpose");
  if (
    !(RESIDENTIAL_SALE_PROPERTY_TYPES as readonly string[]).includes(
      record.propertyType,
    )
  ) {
    missing.push("approved residential property type");
  }
  if (!Number.isFinite(record.price?.amount) || record.price.amount < 0) {
    missing.push("valid PHP price");
  }
  if (!record.location?.province?.trim() || !record.location.city?.trim()) {
    missing.push("public location");
  }
  if (!validPublicPrecision(record.location?.publicPrecision)) {
    missing.push("public location precision");
  }
  if (!record.shortDescription?.trim()) missing.push("short description");
  if (!record.description?.trim()) missing.push("full description");
  return {
    id: String(record._id),
    propertyId: record.propertyId,
    slug: record.slug,
    title: record.title,
    purpose: record.purpose,
    propertyType: record.propertyType,
    availability: record.availability,
    publicationStatus: record.publicationStatus,
    featured: record.featured ?? false,
    ...(Number.isInteger(record.featuredOrder)
      ? { featuredOrder: record.featuredOrder }
      : {}),
    price: record.price,
    location: {
      province: record.location.province,
      city: record.location.city,
      ...(record.location.barangay ? { barangay: record.location.barangay } : {}),
      ...(record.location.development
        ? { development: record.location.development }
        : {}),
      publicPrecision: record.location.publicPrecision ?? "city-only",
    },
    shortDescription: record.shortDescription,
    publicationReadiness: { ready: missing.length === 0, missing },
    version: record.__v ?? 0,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAdminPropertyDetail(
  record: AdminPropertyRecord,
): AdminPropertyDetail {
  const summary = toAdminPropertySummary(record);
  return {
    ...summary,
    location: {
      ...summary.location,
      ...(record.location.privateAddress
        ? { privateAddress: record.location.privateAddress }
        : {}),
      ...(validPrivateCoordinates(record.location.coordinates)
        ? {
            coordinates: {
              latitude: record.location.coordinates.latitude,
              longitude: record.location.coordinates.longitude,
            },
          }
        : {}),
      ...(validPublicPoint(record.location.publicPoint)
        ? {
            publicPoint: {
              type: "Point",
              coordinates: [
                record.location.publicPoint.coordinates[0],
                record.location.publicPoint.coordinates[1],
              ],
            },
          }
        : {}),
    },
    specifications: record.specifications,
    description: record.description,
    highlights: record.highlights,
    amenities: record.amenities,
    features: record.features,
    ...(record.coverMedia ? { coverMedia: record.coverMedia } : {}),
    gallery: record.gallery,
    createdAt: record.createdAt.toISOString(),
    ...(record.publishedAt ? { publishedAt: record.publishedAt.toISOString() } : {}),
  };
}

interface FacetAggregate {
  _id: null;
  min: number;
  max: number;
  propertyTypes: PropertyFacetsResponse["propertyTypes"];
}

interface LocationCountAggregate {
  _id: string;
  count: number;
}

export class MongoosePropertyService implements PropertyService {
  constructor(private readonly model: Model<PropertyEntity> = PropertyModel) {}

  async search(request: PropertySearchRequest): Promise<PropertySearchResponse> {
    const filter = buildPublishedPropertyFilter(request);
    const skip = (request.page - 1) * request.limit;
    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .select(PUBLIC_PROPERTY_SUMMARY_PROJECTION)
        .sort(sortFor(request.sort, request.featured === true))
        .skip(skip)
        .limit(request.limit)
        .lean<PublicPropertyRecord[]>(),
      this.model.countDocuments(filter),
    ]);

    const { sort, page, limit, ...appliedFilters } = request;
    return {
      items: records.map(toPublicPropertySummary),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
      appliedFilters,
      sort,
    };
  }

  async map(request: PropertySearchRequest): Promise<PropertyMapResponse> {
    const publishedFilter = buildPublishedPropertyFilter(request);
    const mappableFilter: QueryFilter<PropertyEntity> = {
      $and: [
        publishedFilter,
        {
          "location.publicPrecision": { $in: PUBLIC_LOCATION_PRECISIONS },
          "location.publicPoint.type": "Point",
          "location.publicPoint.coordinates": { $exists: true },
        },
      ],
    };

    const [records, matchingTotal, mappableTotal] = await Promise.all([
      this.model
        .find(mappableFilter)
        .select(PUBLIC_PROPERTY_MAP_PROJECTION)
        .sort(sortFor("newest"))
        .limit(MAP_RESULT_LIMIT)
        .lean<PublicPropertyRecord[]>(),
      this.model.countDocuments(publishedFilter),
      this.model.countDocuments(mappableFilter),
    ]);
    const items = records
      .map(toPublicPropertyMapItem)
      .filter((item): item is PublicPropertyMapItem => item !== undefined);
    const { sort, page, limit, ...appliedFilters } = request;
    void sort;
    void page;
    void limit;

    return {
      items,
      matchingTotal,
      mappableTotal,
      returned: items.length,
      truncated: mappableTotal > items.length,
      appliedFilters,
    };
  }

  async findPublishedBySlug(slug: string): Promise<PublicPropertyDetail | null> {
    const record = await this.model
      .findOne(buildPublishedPropertyDetailFilter(slug))
      .select(PUBLIC_PROPERTY_DETAIL_PROJECTION)
      .lean<PublicPropertyRecord | null>();
    return record ? toPublicPropertyDetail(record) : null;
  }

  async related(slug: string): Promise<RelatedPropertiesResponse | null> {
    const current = await this.model
      .findOne(buildPublishedPropertyDetailFilter(slug))
      .select("_id propertyType price.amount location.city")
      .lean<PublicPropertyRecord | null>();
    if (!current) return null;

    const price = current.price.amount;
    const candidates = await this.model
      .find({
        publicationStatus: "published",
        purpose: "sale",
        propertyType: { $in: RESIDENTIAL_SALE_PROPERTY_TYPES },
        _id: { $ne: current._id },
        $or: [
          { "location.city": current.location.city },
          { propertyType: current.propertyType },
          {
            "price.amount": {
              $gte: Math.max(0, price * 0.8),
              $lte: price * 1.2,
            },
          },
        ],
      })
      .select(PUBLIC_PROPERTY_SUMMARY_PROJECTION)
      .sort({ availability: 1, publishedAt: -1, _id: -1 })
      .limit(12)
      .lean<PublicPropertyRecord[]>();

    const score = (record: PublicPropertyRecord) => {
      let value = record.location.city === current.location.city ? 4 : 0;
      if (record.propertyType === current.propertyType) value += 3;
      const withinPriceRange =
        price === 0
          ? record.price.amount === 0
          : Math.abs(record.price.amount - price) / price <= 0.2;
      if (withinPriceRange) value += 2;
      if (record.availability === "available") value += 1;
      return value;
    };
    candidates.sort((left, right) => {
      const scoreDifference = score(right) - score(left);
      if (scoreDifference !== 0) return scoreDifference;
      const publishedDifference =
        right.publishedAt.getTime() - left.publishedAt.getTime();
      return publishedDifference || String(right._id).localeCompare(String(left._id));
    });

    return { items: candidates.slice(0, 3).map(toPublicPropertySummary) };
  }

  async getFacets(): Promise<PropertyFacetsResponse> {
    const [facetResults, locationCounts] = await Promise.all([
      this.model.aggregate<FacetAggregate>([
        {
          $match: {
            publicationStatus: "published",
            purpose: "sale",
            propertyType: { $in: RESIDENTIAL_SALE_PROPERTY_TYPES },
          },
        },
        {
          $project: {
            price: "$price.amount",
            propertyType: 1,
          },
        },
        {
          $group: {
            _id: null,
            min: { $min: "$price" },
            max: { $max: "$price" },
            propertyTypes: { $addToSet: "$propertyType" },
          },
        },
      ]),
      this.model.aggregate<LocationCountAggregate>([
        {
          $match: {
            publicationStatus: "published",
            purpose: "sale",
            propertyType: { $in: RESIDENTIAL_SALE_PROPERTY_TYPES },
            "location.province": "Pampanga",
            "location.city": { $in: PUBLIC_PROPERTY_AREAS },
          },
        },
        {
          $group: {
            _id: { $concat: ["$location.city", ", ", "$location.province"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: PUBLIC_PROPERTY_AREAS.length },
      ]),
    ]);
    const result = facetResults[0];

    return {
      locations: locationCounts
        .map((item) => item._id)
        .sort((a, b) => a.localeCompare(b)),
      locationCounts: locationCounts.map((item) => ({
        location: item._id,
        count: item.count,
      })),
      propertyTypes: result
        ? result.propertyTypes.sort((a, b) => a.localeCompare(b))
        : [],
      priceRange: {
        min: result?.min ?? null,
        max: result?.max ?? null,
        currency: "PHP",
      },
    };
  }
}

export const mongoosePropertyService = new MongoosePropertyService();

export function buildAdminPropertyFilter(
  request: AdminPropertyListRequest,
): QueryFilter<PropertyEntity> {
  const filter: QueryFilter<PropertyEntity> = {
    ...(request.publicationStatus
      ? { publicationStatus: request.publicationStatus }
      : {}),
    ...(request.availability ? { availability: request.availability } : {}),
    ...(request.featured !== undefined ? { featured: request.featured } : {}),
  };
  if (request.query) {
    const query = new RegExp(escapeRegex(request.query), "i");
    filter.$or = [
      { propertyId: query },
      { slug: query },
      { title: query },
      { "location.city": query },
    ];
  }
  return filter;
}

export class MongoosePropertyAdminRepository implements PropertyAdminRepository {
  constructor(private readonly model: Model<PropertyEntity> = PropertyModel) {}

  async list(
    request: AdminPropertyListRequest,
  ): Promise<{ records: AdminPropertyRecord[]; total: number }> {
    const filter = buildAdminPropertyFilter(request);
    const skip = (request.page - 1) * request.limit;
    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .select(ADMIN_PROPERTY_PROJECTION)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(request.limit)
        .lean<AdminPropertyRecord[]>(),
      this.model.countDocuments(filter),
    ]);
    return { records, total };
  }

  async findById(id: string): Promise<AdminPropertyRecord | null> {
    return this.model
      .findById(id)
      .select(ADMIN_PROPERTY_DETAIL_PROJECTION)
      .lean<AdminPropertyRecord | null>();
  }

  async isMediaReferenced(objectReference: string): Promise<boolean> {
    return Boolean(
      await this.model.exists({
        $or: [
          { "gallery.url": objectReference },
          { "coverMedia.url": objectReference },
        ],
      }),
    );
  }

  async createDraft(
    input: DraftPropertyPersistenceInput,
  ): Promise<AdminPropertyRecord> {
    const document = await this.model.create(input);
    return document.toObject() as AdminPropertyRecord;
  }

  async updateDraft(
    id: string,
    expectedVersion: number,
    input: Partial<PropertyContentPersistenceInput>,
  ): Promise<AdminPropertyRecord | null> {
    const versionFilter =
      expectedVersion === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: expectedVersion };
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          ...versionFilter,
          publicationStatus: { $in: ["draft", "unpublished"] },
        },
        { $set: input, $inc: { __v: 1 } },
        { new: true, runValidators: true },
      )
      .select(ADMIN_PROPERTY_DETAIL_PROJECTION)
      .lean<AdminPropertyRecord | null>();
  }

  async updateMedia(
    id: string,
    expectedVersion: number,
    media: AdminPropertyMediaInput[],
    coverMedia?: AdminPropertyMediaInput,
  ): Promise<AdminPropertyRecord | null> {
    const versionFilter =
      expectedVersion === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: expectedVersion };
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          ...versionFilter,
          publicationStatus: { $in: ["draft", "unpublished"] },
        },
        {
          $set: { gallery: media, ...(coverMedia ? { coverMedia } : {}) },
          ...(!coverMedia ? { $unset: { coverMedia: 1 } } : {}),
          $inc: { __v: 1 },
        },
        { new: true, runValidators: true },
      )
      .select(ADMIN_PROPERTY_DETAIL_PROJECTION)
      .lean<AdminPropertyRecord | null>();
  }

  async updateFeatured(
    id: string,
    expectedVersion: number,
    featured: boolean,
    featuredOrder?: number,
  ): Promise<AdminPropertyRecord | null> {
    const versionFilter =
      expectedVersion === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: expectedVersion };
    return this.model
      .findOneAndUpdate(
        { _id: id, ...versionFilter },
        {
          $set: {
            featured,
            ...(featuredOrder !== undefined ? { featuredOrder } : {}),
          },
          ...(featuredOrder === undefined ? { $unset: { featuredOrder: 1 } } : {}),
          $inc: { __v: 1 },
        },
        { new: true, runValidators: true },
      )
      .select(ADMIN_PROPERTY_DETAIL_PROJECTION)
      .lean<AdminPropertyRecord | null>();
  }

  async transition(
    id: string,
    expectedVersion: number,
    currentPublicationStatus: import("@rc/shared").PropertyPublicationStatus,
    update: {
      publicationStatus?: import("@rc/shared").PropertyPublicationStatus;
      availability?: import("@rc/shared").PropertyAvailability;
      publishedAt?: Date;
      archiveRestoreStatus?: "draft" | "unpublished";
      clearArchiveRestoreStatus?: boolean;
    },
  ): Promise<AdminPropertyRecord | null> {
    const { clearArchiveRestoreStatus, ...set } = update;
    const versionFilter =
      expectedVersion === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: expectedVersion };
    return this.model
      .findOneAndUpdate(
        { _id: id, ...versionFilter, publicationStatus: currentPublicationStatus },
        {
          $set: set,
          ...(clearArchiveRestoreStatus ? { $unset: { archiveRestoreStatus: 1 } } : {}),
          $inc: { __v: 1 },
        },
        { new: true, runValidators: true },
      )
      .select(ADMIN_PROPERTY_DETAIL_PROJECTION)
      .lean<AdminPropertyRecord | null>();
  }
}

function createPersistenceInput(
  input: CreateDraftPropertyRequest,
): DraftPropertyPersistenceInput {
  return {
    propertyId: input.propertyId,
    slug: input.slug,
    title: input.title,
    purpose: input.purpose,
    propertyType: input.propertyType,
    featured: input.featured,
    price: { ...input.price, currency: "PHP" },
    location: input.location,
    specifications: input.specifications,
    shortDescription: input.shortDescription,
    description: input.description,
    highlights: input.highlights,
    amenities: input.amenities,
    features: input.features,
    availability: "available",
    publicationStatus: "draft",
  };
}

function updatePersistenceInput(
  input: UpdateDraftPropertyRequest,
): Partial<PropertyContentPersistenceInput> {
  return {
    ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
    ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.price !== undefined
      ? { price: { ...input.price, currency: "PHP" as const } }
      : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.specifications !== undefined
      ? { specifications: input.specifications }
      : {}),
    ...(input.shortDescription !== undefined
      ? { shortDescription: input.shortDescription }
      : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.highlights !== undefined ? { highlights: input.highlights } : {}),
    ...(input.amenities !== undefined ? { amenities: input.amenities } : {}),
    ...(input.features !== undefined ? { features: input.features } : {}),
  };
}

function changedFields(input: UpdateDraftPropertyRequest): AdminPropertyContentField[] {
  return ADMIN_PROPERTY_CONTENT_FIELDS.filter((field) => input[field] !== undefined);
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export class DefaultAdminPropertyService implements AdminPropertyService {
  constructor(
    private readonly repository: PropertyAdminRepository,
    private readonly audit: PropertyAuditRecorder,
    private readonly mediaStorage: PropertyMediaStorage = propertyMediaStorage,
    private readonly cleanupDebt: MediaCleanupDebtRecorder = mongooseMediaCleanupDebtRecorder,
  ) {}

  private async removeOwnedMediaOrRecordDebt(
    propertyId: string,
    objectReference: string,
    reason: MediaCleanupReason,
    requestId: string,
  ): Promise<void> {
    if (this.mediaStorage.owns && !this.mediaStorage.owns(objectReference)) return;
    try {
      if (await this.repository.isMediaReferenced(objectReference)) {
        operationalLogger.warn("property_media_cleanup_reference_retained", {
          dependency: "mongodb",
          entityType: "property",
          entityId: propertyId,
          requestId,
          errorCode: "media_object_still_referenced",
        });
        return;
      }
    } catch (error) {
      operationalLogger.warn("property_media_cleanup_reference_check_failed", {
        dependency: "mongodb",
        entityType: "property",
        entityId: propertyId,
        requestId,
        errorCode: "media_reference_check_failed",
        ...errorIdentity(error),
      });
      await this.recordCleanupDebt(
        propertyId,
        objectReference,
        reason,
        "media_reference_check_failed",
        requestId,
      );
      return;
    }
    try {
      await this.mediaStorage.remove(objectReference);
    } catch (error) {
      const errorCode = propertyMediaStorageErrorCode(error);
      operationalLogger.warn("property_media_cleanup_deferred", {
        dependency: "media-storage",
        entityType: "property",
        entityId: propertyId,
        requestId,
        errorCode,
        ...errorIdentity(error),
      });
      try {
        await this.cleanupDebt.record({
          propertyId,
          objectReference,
          reason,
          errorCode,
          failedAt: new Date(),
        });
      } catch (debtError) {
        operationalLogger.error("property_media_cleanup_debt_record_failed", {
          dependency: "mongodb",
          entityType: "property",
          entityId: propertyId,
          requestId,
          errorCode: "cleanup_debt_persistence_failed",
          ...errorIdentity(debtError),
        });
      }
    }
  }

  private async recordCleanupDebt(
    propertyId: string,
    objectReference: string,
    reason: MediaCleanupReason,
    errorCode: string,
    requestId: string,
  ): Promise<void> {
    if (this.mediaStorage.owns && !this.mediaStorage.owns(objectReference)) return;
    try {
      await this.cleanupDebt.record({
        propertyId,
        objectReference,
        reason,
        errorCode,
        failedAt: new Date(),
      });
    } catch (error) {
      operationalLogger.error("property_media_cleanup_debt_record_failed", {
        dependency: "mongodb",
        entityType: "property",
        entityId: propertyId,
        requestId,
        errorCode: "cleanup_debt_persistence_failed",
        ...errorIdentity(error),
      });
    }
  }

  async listPrivate(
    request: AdminPropertyListRequest,
  ): Promise<AdminPropertyListResponse> {
    const { records, total } = await this.repository.list(request);
    return {
      items: records.map(toAdminPropertySummary),
      pagination: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / request.limit),
      },
    };
  }

  async findPrivateById(id: string): Promise<AdminPropertyDetail | null> {
    const record = await this.repository.findById(id);
    return record ? toAdminPropertyDetail(record) : null;
  }

  async createDraft(
    input: CreateDraftPropertyRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail> {
    if (input.purpose !== "sale") {
      throw new HttpError(400, "Property administration is limited to sales.");
    }
    try {
      const record = await this.repository.createDraft(createPersistenceInput(input));
      await this.audit.recordAudit({
        actorStaffIdentityId: context.actorStaffIdentityId,
        action: "property.created",
        entityType: "property",
        entityId: String(record._id),
        outcome: "succeeded",
        requestId: context.requestId,
        changedFields: [...ADMIN_PROPERTY_CONTENT_FIELDS],
        occurredAt: context.occurredAt ?? new Date(),
      });
      return toAdminPropertyDetail(record);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new HttpError(409, "Property ID or slug already exists.");
      }
      throw error;
    }
  }

  async updateDraft(
    id: string,
    input: UpdateDraftPropertyRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    try {
      const current = await this.findExpectedRecord(id, input.expectedVersion);
      if (!current) return null;
      if (input.propertyId !== undefined && input.propertyId !== current.propertyId) {
        throw new HttpError(409, "Property ID cannot be changed after creation.");
      }
      if (
        current.publishedAt &&
        input.slug !== undefined &&
        input.slug !== current.slug
      ) {
        throw new HttpError(409, "URL slug cannot be changed after first publication.");
      }
      const requestedPurpose = (input as { purpose?: unknown }).purpose;
      if (
        current.purpose !== "sale" ||
        (requestedPurpose !== undefined && requestedPurpose !== "sale") ||
        !(RESIDENTIAL_SALE_PROPERTY_TYPES as readonly string[]).includes(
          current.propertyType,
        )
      ) {
        throw new HttpError(
          409,
          "Legacy non-residential or non-sale records require deliberate data reconciliation and cannot be edited here.",
        );
      }
      if (!["draft", "unpublished"].includes(current.publicationStatus)) {
        throw new HttpError(409, "Only draft or unpublished properties can be edited.");
      }
      const record = await this.repository.updateDraft(
        id,
        input.expectedVersion,
        updatePersistenceInput(input),
      );
      if (!record) throw this.concurrencyConflict();
      await this.audit.recordAudit({
        actorStaffIdentityId: context.actorStaffIdentityId,
        action: "property.edited",
        entityType: "property",
        entityId: String(record._id),
        outcome: "succeeded",
        requestId: context.requestId,
        changedFields: changedFields(input),
        occurredAt: context.occurredAt ?? new Date(),
      });
      return toAdminPropertyDetail(record);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new HttpError(409, "Property ID or slug already exists.");
      }
      throw error;
    }
  }

  async updateMedia(
    id: string,
    input: UpdatePropertyMediaRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (!["draft", "unpublished"].includes(current.publicationStatus)) {
      throw new HttpError(
        409,
        "Unpublish or restore this property before editing media.",
      );
    }
    if (
      env.IS_PRODUCTION &&
      input.media.some((item) => item.source === "development-sample")
    ) {
      throw new HttpError(
        400,
        "Development sample media cannot be saved in production.",
      );
    }
    const existingUrls = new Set(
      current.gallery.flatMap((item) => (item.url ? [item.url] : [])),
    );
    const newlyClaimedManagedReference = input.media.find(
      (item) =>
        Boolean(this.mediaStorage.owns?.(item.url)) && !existingUrls.has(item.url),
    );
    if (newlyClaimedManagedReference) {
      throw new HttpError(
        400,
        "Managed property media must be added through the device upload endpoint.",
      );
    }
    const coverMedia = input.coverMediaId
      ? input.media.find((item) => item.id === input.coverMediaId)
      : undefined;
    const record = await this.repository.updateMedia(
      id,
      input.expectedVersion,
      input.media,
      coverMedia,
    );
    if (!record) throw this.concurrencyConflict();
    const retainedUrls = new Set(input.media.map((item) => item.url));
    const removedUrls = current.gallery
      .map((item) => item.url)
      .filter((url): url is string => Boolean(url) && !retainedUrls.has(url as string));
    try {
      await this.audit.recordAudit({
        actorStaffIdentityId: context.actorStaffIdentityId,
        action: "property.media-updated",
        entityType: "property",
        entityId: String(record._id),
        outcome: "succeeded",
        requestId: context.requestId,
        occurredAt: context.occurredAt ?? new Date(),
      });
    } catch (error) {
      operationalLogger.error("property_media_audit_failed_after_commit", {
        dependency: "mongodb",
        entityType: "property",
        entityId: id,
        requestId: context.requestId,
        errorCode: "audit_write_failed",
        ...errorIdentity(error),
      });
      await Promise.all(
        removedUrls.map((url) =>
          this.recordCleanupDebt(
            id,
            url,
            "metadata-removed",
            "audit_write_failed",
            context.requestId,
          ),
        ),
      );
      throw error;
    }
    await Promise.all(
      removedUrls.map((url) =>
        this.removeOwnedMediaOrRecordDebt(
          id,
          url,
          "metadata-removed",
          context.requestId,
        ),
      ),
    );
    return toAdminPropertyDetail(record);
  }

  async uploadImage(
    id: string,
    input: UploadPropertyImageRequest,
    bytes: Buffer,
    declaredMimeType: string | undefined,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (!["draft", "unpublished"].includes(current.publicationStatus)) {
      throw new HttpError(
        409,
        "Unpublish or restore this property before uploading media.",
      );
    }
    if (current.gallery.length >= MAX_PROPERTY_IMAGES) {
      throw new HttpError(
        409,
        `This property already has ${MAX_PROPERTY_IMAGES} images.`,
      );
    }
    let image;
    try {
      image = await inspectPropertyImage(bytes, declaredMimeType);
    } catch (error) {
      operationalLogger.warn("property_media_validation_failed", {
        entityType: "property",
        entityId: id,
        requestId: context.requestId,
        errorCode: "media_validation_failed",
        ...errorIdentity(error),
      });
      throw error;
    }
    let stored;
    try {
      stored = await this.mediaStorage.store(bytes, image);
    } catch (error) {
      operationalLogger.error("property_media_upload_failed", {
        dependency: "media-storage",
        entityType: "property",
        entityId: id,
        requestId: context.requestId,
        errorCode: propertyMediaStorageErrorCode(error),
        ...errorIdentity(error),
      });
      throw error;
    }
    const existingMedia: AdminPropertyMediaInput[] = current.gallery.map(
      (item, index) => ({
        id: item.id ?? `legacy-${index}-${String(current._id)}`,
        kind: "image",
        url: item.url ?? "",
        alt: item.alt,
        ...(item.caption ? { caption: item.caption } : {}),
        source: item.source ?? "production",
        ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
        ...(item.attribution ? { attribution: item.attribution } : {}),
        ...(item.focalPoint ? { focalPoint: item.focalPoint } : {}),
      }),
    );
    const uploaded: AdminPropertyMediaInput = {
      id: stored.id,
      kind: "image",
      url: stored.url,
      alt: input.alt,
      ...(input.caption ? { caption: input.caption } : {}),
      source: "production",
      focalPoint: { x: 50, y: 50 },
    };
    const nextMedia = [...existingMedia, uploaded];
    const currentCoverId = current.coverMedia?.id ?? existingMedia[0]?.id;
    const cover = nextMedia.find((item) => item.id === currentCoverId) ?? uploaded;
    let record;
    try {
      record = await this.repository.updateMedia(
        id,
        input.expectedVersion,
        nextMedia,
        cover,
      );
      if (!record) throw this.concurrencyConflict();
    } catch (error) {
      operationalLogger.error("property_media_metadata_save_failed", {
        dependency: "mongodb",
        entityType: "property",
        entityId: id,
        requestId: context.requestId,
        errorCode: "media_metadata_save_failed",
        ...errorIdentity(error),
      });
      await this.removeOwnedMediaOrRecordDebt(
        id,
        stored.url,
        "metadata-save-failed",
        context.requestId,
      );
      throw error;
    }
    try {
      await this.audit.recordAudit({
        actorStaffIdentityId: context.actorStaffIdentityId,
        action: "property.media-updated",
        entityType: "property",
        entityId: String(record._id),
        outcome: "succeeded",
        requestId: context.requestId,
        occurredAt: context.occurredAt ?? new Date(),
      });
      return toAdminPropertyDetail(record);
    } catch (error) {
      operationalLogger.error("property_media_audit_failed_after_commit", {
        dependency: "mongodb",
        entityType: "property",
        entityId: id,
        requestId: context.requestId,
        errorCode: "audit_write_failed",
        ...errorIdentity(error),
      });
      throw error;
    }
  }

  async publish(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.purpose !== "sale") {
      throw new HttpError(409, "Only sale properties can be published.");
    }
    const readiness = toAdminPropertySummary(current).publicationReadiness;
    if (!readiness.ready) {
      throw new HttpError(
        409,
        `Complete this property before publishing: ${readiness.missing.join(", ")}.`,
      );
    }
    if (!["draft", "unpublished"].includes(current.publicationStatus)) {
      throw new HttpError(
        409,
        "This property cannot be published from its current state.",
      );
    }
    return this.applyTransition(
      current,
      input.expectedVersion,
      { publicationStatus: "published", publishedAt: context.occurredAt ?? new Date() },
      "property.published",
      context,
    );
  }

  async unpublish(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.publicationStatus !== "published") {
      throw new HttpError(409, "Only a published property can be unpublished.");
    }
    return this.applyTransition(
      current,
      input.expectedVersion,
      { publicationStatus: "unpublished" },
      "property.unpublished",
      context,
    );
  }

  async archive(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.publicationStatus === "archived") {
      throw new HttpError(409, "This property is already archived.");
    }
    const archiveRestoreStatus =
      current.publicationStatus === "published" ||
      current.publicationStatus === "unpublished"
        ? "unpublished"
        : "draft";
    return this.applyTransition(
      current,
      input.expectedVersion,
      { publicationStatus: "archived", archiveRestoreStatus },
      "property.archived",
      context,
    );
  }

  async restore(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.publicationStatus !== "archived") {
      throw new HttpError(409, "Only an archived property can be restored.");
    }
    return this.applyTransition(
      current,
      input.expectedVersion,
      {
        publicationStatus: current.archiveRestoreStatus ?? "draft",
        clearArchiveRestoreStatus: true,
      },
      "property.restored",
      context,
    );
  }

  async changeAvailability(
    id: string,
    input: AdminPropertyAvailabilityRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.publicationStatus !== "published") {
      throw new HttpError(
        409,
        "Availability can change only while a property is published.",
      );
    }
    const allowed: Record<
      import("@rc/shared").PropertyAvailability,
      readonly import("@rc/shared").PropertyAvailability[]
    > = {
      available: ["reserved", "sold"],
      reserved: ["available", "sold"],
      sold: [],
    };
    if (!allowed[current.availability].includes(input.availability)) {
      throw new HttpError(409, "This availability change is not allowed.");
    }
    const action =
      input.availability === "reserved"
        ? "property.reserved"
        : input.availability === "sold"
          ? "property.sold"
          : "property.availability-changed";
    return this.applyTransition(
      current,
      input.expectedVersion,
      { availability: input.availability },
      action,
      context,
    );
  }

  async updateFeatured(
    id: string,
    input: AdminPropertyFeaturedRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (
      input.featured &&
      (current.publicationStatus !== "published" || current.availability === "sold")
    ) {
      throw new HttpError(
        409,
        "Only published available or reserved properties can be featured.",
      );
    }
    const featuredOrder = input.featured
      ? input.featuredOrder === null
        ? undefined
        : (input.featuredOrder ?? current.featuredOrder)
      : undefined;
    const record = await this.repository.updateFeatured(
      id,
      input.expectedVersion,
      input.featured,
      featuredOrder,
    );
    if (!record) throw this.concurrencyConflict();
    const changedFields: Array<AdminPropertyContentField | "featuredOrder"> = [];
    if (current.featured !== input.featured) changedFields.push("featured");
    if (current.featuredOrder !== featuredOrder) {
      changedFields.push("featuredOrder");
    }
    await this.audit.recordAudit({
      actorStaffIdentityId: context.actorStaffIdentityId,
      action: "property.edited",
      entityType: "property",
      entityId: String(record._id),
      outcome: "succeeded",
      requestId: context.requestId,
      changedFields,
      occurredAt: context.occurredAt ?? new Date(),
    });
    return toAdminPropertyDetail(record);
  }

  private async findExpectedRecord(
    id: string,
    expectedVersion: number,
  ): Promise<AdminPropertyRecord | null> {
    const current = await this.repository.findById(id);
    if (!current) return null;
    if ((current.__v ?? 0) !== expectedVersion) throw this.concurrencyConflict();
    return current;
  }

  private concurrencyConflict(): HttpError {
    return new HttpError(
      409,
      "This property changed after you loaded it. Refresh and review the latest version.",
    );
  }

  private async applyTransition(
    current: AdminPropertyRecord,
    expectedVersion: number,
    update: Parameters<PropertyAdminRepository["transition"]>[3],
    action: import("../auth/auth.types.js").AuditAction,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail> {
    const record = await this.repository.transition(
      String(current._id),
      expectedVersion,
      current.publicationStatus,
      update,
    );
    if (!record) throw this.concurrencyConflict();
    await this.audit.recordAudit({
      actorStaffIdentityId: context.actorStaffIdentityId,
      action,
      entityType: "property",
      entityId: String(record._id),
      outcome: "succeeded",
      requestId: context.requestId,
      occurredAt: context.occurredAt ?? new Date(),
    });
    return toAdminPropertyDetail(record);
  }
}

export const mongooseAdminPropertyService = new DefaultAdminPropertyService(
  new MongoosePropertyAdminRepository(),
  mongooseAuthStore,
);
