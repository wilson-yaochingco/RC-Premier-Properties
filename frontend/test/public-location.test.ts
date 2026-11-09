import { describe, expect, it } from "vitest";
import {
  publicLocationCatalogPath,
  publicLocationSlug,
  shortPublicLocation,
} from "../src/lib/public-location";

describe("public location routes", () => {
  it("builds stable map slugs and short-name catalog filters", () => {
    expect(shortPublicLocation("Angeles City, Pampanga")).toBe("Angeles City");
    expect(publicLocationSlug("City of San Fernando, Pampanga")).toBe(
      "city-of-san-fernando",
    );
    expect(publicLocationCatalogPath("Angeles City, Pampanga")).toBe(
      "/properties?location=Angeles+City",
    );
  });
});
