import {
  ADMIN_PROPERTY_CONTENT_FIELDS,
  PUBLIC_LOCATION_PRECISIONS,
  type AdminPropertyContentField,
  type AdminPropertyDetail,
  type AdminPropertyAvailabilityRequest,
  type AdminPropertyListRequest,
  type AdminPropertyListResponse,
  type AdminPropertySummary,
  type AdminPropertyTransitionRequest,
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
  type UpdateDraftPropertyRequest,
} from "@rc/shared";
import type { Model, QueryFilter, SortOrder } from "mongoose";
import { HttpError } from "../../middleware/errorHandler.js";
import { mongooseAuthStore } from "../auth/auth.store.js";
import { PropertyModel } from "./property.model.js";
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

const PUBLIC_PROPERTY_PROJECTION = [
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
  "description",
  "highlights",
  "amenities",
  "features",
  "coverMedia",
  "gallery",
  "publishedAt",
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
  "publishedAt",
  "archiveRestoreStatus",
  "__v",
  "createdAt",
  "updatedAt",
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
  const filter: QueryFilter<PropertyEntity> = { publicationStatus: "published" };

  if (request.propertyId) filter.propertyId = request.propertyId.toUpperCase();
  if (request.area) filter["location.city"] = request.area;
  if (request.propertyType) filter.propertyType = request.propertyType;
  if (request.purpose) filter.purpose = request.purpose;
  if (request.featured !== undefined) filter.featured = request.featured;

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
  return { publicationStatus: "published", slug };
}

function sortFor(sort: PropertySort): Record<string, SortOrder> {
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
    featured: record.featured,
    price: record.price,
    location: publicLocation(record),
    specifications: record.specifications,
    shortDescription: record.shortDescription,
    ...(record.coverMedia ? { coverMedia: record.coverMedia } : {}),
    publishedAt: record.publishedAt.toISOString(),
  };
}

function toPublicPropertyMapItem(
  record: PublicPropertyRecord,
): PublicPropertyMapItem | undefined {
  const summary = toPublicPropertySummary(record);
  if (!summary.location.publicPoint) return undefined;

  return {
    id: summary.id,
    propertyId: summary.propertyId,
    slug: summary.slug,
    title: summary.title,
    purpose: summary.purpose,
    propertyType: summary.propertyType,
    availability: summary.availability,
    price: summary.price,
    location: summary.location,
    specifications: summary.specifications,
    ...(summary.coverMedia ? { coverMedia: summary.coverMedia } : {}),
  };
}

function toPublicPropertyDetail(record: PublicPropertyRecord): PublicPropertyDetail {
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
  return {
    id: String(record._id),
    propertyId: record.propertyId,
    slug: record.slug,
    title: record.title,
    purpose: record.purpose,
    propertyType: record.propertyType,
    availability: record.availability,
    publicationStatus: record.publicationStatus,
    featured: record.featured,
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
    version: record.__v ?? 0,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAdminPropertyDetail(
  record: AdminPropertyRecord,
): AdminPropertyDetail {
  return {
    ...toAdminPropertySummary(record),
    specifications: record.specifications,
    description: record.description,
    highlights: record.highlights,
    amenities: record.amenities,
    features: record.features,
    createdAt: record.createdAt.toISOString(),
    ...(record.publishedAt ? { publishedAt: record.publishedAt.toISOString() } : {}),
  };
}

interface FacetAggregate {
  _id: null;
  min: number;
  max: number;
  locations: string[];
  propertyTypes: PropertyFacetsResponse["propertyTypes"];
}

export class MongoosePropertyService implements PropertyService {
  constructor(private readonly model: Model<PropertyEntity> = PropertyModel) {}

  async search(request: PropertySearchRequest): Promise<PropertySearchResponse> {
    const filter = buildPublishedPropertyFilter(request);
    const skip = (request.page - 1) * request.limit;
    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .select(PUBLIC_PROPERTY_PROJECTION)
        .sort(sortFor(request.sort))
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
        .select(PUBLIC_PROPERTY_PROJECTION)
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
      .select(PUBLIC_PROPERTY_PROJECTION)
      .lean<PublicPropertyRecord | null>();
    return record ? toPublicPropertyDetail(record) : null;
  }

  async getFacets(): Promise<PropertyFacetsResponse> {
    const [result] = await this.model.aggregate<FacetAggregate>([
      { $match: { publicationStatus: "published" } },
      {
        $project: {
          price: "$price.amount",
          propertyType: 1,
          location: {
            $concat: ["$location.city", ", ", "$location.province"],
          },
        },
      },
      {
        $group: {
          _id: null,
          min: { $min: "$price" },
          max: { $max: "$price" },
          locations: { $addToSet: "$location" },
          propertyTypes: { $addToSet: "$propertyType" },
        },
      },
    ]);

    return {
      locations: result ? result.locations.sort((a, b) => a.localeCompare(b)) : [],
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
      .select(ADMIN_PROPERTY_PROJECTION)
      .lean<AdminPropertyRecord | null>();
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
      .select(ADMIN_PROPERTY_PROJECTION)
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
      .select(ADMIN_PROPERTY_PROJECTION)
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
  ) {}

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

  async publish(
    id: string,
    input: AdminPropertyTransitionRequest,
    context: PropertyMutationContext,
  ): Promise<AdminPropertyDetail | null> {
    const current = await this.findExpectedRecord(id, input.expectedVersion);
    if (!current) return null;
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
