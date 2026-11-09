import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export function buildLocationsMetadata(imagePath: string): Metadata {
  return buildPageMetadata({
    title: "Pampanga Locations with Properties for Sale",
    description:
      "Explore the Pampanga cities and municipalities where RC Premier Properties has published listings, and browse homes for sale in each area.",
    canonicalPath: "/locations",
    imagePath,
  });
}
