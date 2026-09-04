import {
  PUBLIC_LOCATION_PRECISIONS,
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
} from "@rc/shared";
import type { Model, QueryFilter, SortOrder } from "mongoose";
import { PropertyModel } from "./property.model.js";
import type {
  PropertyEntity,
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
