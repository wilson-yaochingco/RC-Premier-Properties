import type { PublicPropertySummary } from "@rc/shared";
import { describe, expect, it } from "vitest";
import { pickCollection } from "../src/features/locations/location-collection";

const property = (id: string) => ({ id, slug: id }) as unknown as PublicPropertySummary;

describe("pickCollection", () => {
  it("is empty without listings", () => {
    expect(pickCollection([])).toEqual([]);
  });

  it("keeps API order and shows at most three", () => {
    const items = ["a", "b", "c", "d", "e"].map(property);
    expect(pickCollection(items).map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("never repeats a listing and never pads", () => {
    expect(pickCollection([property("a"), property("a")]).map(({ id }) => id)).toEqual([
      "a",
    ]);
  });
});
