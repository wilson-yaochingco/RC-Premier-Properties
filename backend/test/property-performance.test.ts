import { PUBLIC_PROPERTY_AREAS, type PropertySearchRequest } from "@rc/shared";
import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { MongoosePropertyService } from "../src/modules/properties/property.service.js";
import type { PropertyEntity } from "../src/modules/properties/property.types.js";

const SEARCH: PropertySearchRequest = {
  sort: "newest",
  page: 1,
  limit: 12,
};

function createReadQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

function projectionFields(select: ReturnType<typeof vi.fn>): string[] {
  const projection = select.mock.calls[0]?.[0];
  expect(typeof projection).toBe("string");
  return (projection as string).split(" ");
}

describe("public property read projections", () => {
  it("bounds public location facets to the canonical supported area set", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([
        { _id: null, min: 1_000_000, max: 9_000_000, propertyTypes: [] },
      ])
      .mockResolvedValueOnce(
        PUBLIC_PROPERTY_AREAS.map((city, index) => ({
          _id: `${city}, Pampanga`,
          count: PUBLIC_PROPERTY_AREAS.length - index,
        })),
      );
    const model = { aggregate } as unknown as Model<PropertyEntity>;

    const result = await new MongoosePropertyService(model).getFacets();

    expect(result.locations).toHaveLength(PUBLIC_PROPERTY_AREAS.length);
    const locationPipeline = aggregate.mock.calls[1]?.[0];
    expect(locationPipeline).toEqual(
      expect.arrayContaining([{ $limit: PUBLIC_PROPERTY_AREAS.length }]),
    );
    expect(JSON.stringify(aggregate.mock.calls[0]?.[0])).not.toContain("locations");
    expect(JSON.stringify(locationPipeline)).toContain("location.city");
  });

  it("keeps list queries free of detail-only copy and gallery metadata", async () => {
    const query = createReadQuery([]);
    const model = {
      find: vi.fn().mockReturnValue(query),
      countDocuments: vi.fn().mockResolvedValue(0),
    } as unknown as Model<PropertyEntity>;

    await new MongoosePropertyService(model).search(SEARCH);

    const fields = projectionFields(query.select);
    expect(fields).toEqual(
      expect.arrayContaining(["title", "shortDescription", "coverMedia"]),
    );
    for (const detailOnlyField of [
      "description",
      "highlights",
      "amenities",
      "features",
      "gallery",
      "updatedAt",
    ]) {
      expect(fields).not.toContain(detailOnlyField);
    }
    expect(query.lean).toHaveBeenCalledOnce();
  });

  it("keeps Featured Property results bounded and deterministically priority ordered", async () => {
    const query = createReadQuery([]);
    const model = {
      find: vi.fn().mockReturnValue(query),
      countDocuments: vi.fn().mockResolvedValue(0),
    } as unknown as Model<PropertyEntity>;

    await new MongoosePropertyService(model).search({
      featured: true,
      sort: "newest",
      page: 1,
      limit: 3,
    });

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        publicationStatus: "published",
        featured: true,
        availability: { $ne: "sold" },
      }),
    );
    expect(query.sort).toHaveBeenCalledWith({
      featuredOrder: -1,
      publishedAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it("keeps map queries to fields used by pins and popup cards", async () => {
    const query = createReadQuery([]);
    const model = {
      find: vi.fn().mockReturnValue(query),
      countDocuments: vi.fn().mockResolvedValue(0),
    } as unknown as Model<PropertyEntity>;

    await new MongoosePropertyService(model).map(SEARCH);

    const fields = projectionFields(query.select);
    expect(fields).toEqual(
      expect.arrayContaining(["title", "price", "location.publicPoint", "coverMedia"]),
    );
    for (const unusedMapField of [
      "featured",
      "shortDescription",
      "publishedAt",
      "description",
      "gallery",
    ]) {
      expect(fields).not.toContain(unusedMapField);
    }
    expect(query.skip).not.toHaveBeenCalled();
    expect(query.limit).toHaveBeenCalledWith(200);
  });

  it("retains complete public content only for the detail query", async () => {
    const query = createReadQuery(null);
    const model = {
      findOne: vi.fn().mockReturnValue(query),
    } as unknown as Model<PropertyEntity>;

    await new MongoosePropertyService(model).findPublishedBySlug("test-property");

    expect(projectionFields(query.select)).toEqual(
      expect.arrayContaining([
        "shortDescription",
        "description",
        "highlights",
        "amenities",
        "features",
        "gallery",
        "updatedAt",
      ]),
    );
  });

  it("bounds related-property candidates and fabricates no fallback inventory", async () => {
    const currentQuery = createReadQuery({
      _id: "current-property",
      propertyType: "house-and-lot",
      price: { amount: 8_500_000 },
      location: { city: "Angeles City" },
    });
    const candidatesQuery = createReadQuery([]);
    const model = {
      findOne: vi.fn().mockReturnValue(currentQuery),
      find: vi.fn().mockReturnValue(candidatesQuery),
    } as unknown as Model<PropertyEntity>;

    await expect(
      new MongoosePropertyService(model).related("test-property"),
    ).resolves.toEqual({ items: [] });

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        publicationStatus: "published",
        purpose: "sale",
        _id: { $ne: "current-property" },
      }),
    );
    expect(candidatesQuery.limit).toHaveBeenCalledWith(12);
    const fields = projectionFields(candidatesQuery.select);
    expect(fields).not.toContain("location.privateAddress");
    expect(fields).not.toContain("location.coordinates");
  });
});
