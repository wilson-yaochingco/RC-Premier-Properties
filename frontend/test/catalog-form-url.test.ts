import { describe, expect, it } from "vitest";
import { catalogFormHref } from "../src/features/properties/catalog-form-url";

function entries(
  ...pairs: Array<[string, string]>
): Array<[string, FormDataEntryValue]> {
  return pairs;
}

describe("catalogFormHref", () => {
  it("drops empty fields so All selections never reach the URL", () => {
    const href = catalogFormHref(
      entries(
        ["keyword", ""],
        ["location", "Angeles City"],
        ["propertyType", ""],
        ["minPrice", "  "],
        ["purpose", "sale"],
        ["sort", "newest"],
      ),
    );
    const query = new URL(href, "http://x").searchParams;
    expect([...query.keys()].sort()).toEqual(["location", "purpose", "sort"]);
    expect(query.get("location")).toBe("Angeles City");
  });

  it("trims typed values and keeps hidden context such as the dev fixture", () => {
    const query = new URL(
      catalogFormHref(
        entries(["keyword", "  garden "], ["catalogFixture", "6"], ["purpose", "sale"]),
      ),
      "http://x",
    ).searchParams;
    expect(query.get("keyword")).toBe("garden");
    expect(query.get("catalogFixture")).toBe("6");
  });

  it("never carries a page over, so a new filter starts at page one", () => {
    const href = catalogFormHref(entries(["location", "Arayat"], ["purpose", "sale"]));
    expect(href).not.toContain("page=");
  });

  it("returns the bare path when nothing is set", () => {
    expect(catalogFormHref(entries(["keyword", ""]))).toBe("/properties");
  });
});
