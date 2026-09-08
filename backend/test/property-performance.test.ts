import type { PropertySearchRequest } from "@rc/shared";
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
});
