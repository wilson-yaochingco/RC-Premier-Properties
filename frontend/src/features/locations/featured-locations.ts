import type { PublicPropertySummary } from "@rc/shared";
import { publicLocationCatalogPath } from "../../lib/public-location";

/** Curated places; photography illustrates homes without asserting a locality. */
export const FEATURED_LOCATIONS = [
  {
    name: "Angeles City",
    slug: "angeles-city",
    description: "A city in northern Pampanga.",
    scenery: {
      imagePath:
        "/media/properties/photography-v1/furnished-brand-new-modern-home/furnished-brand-new-modern-home-exterior-front.webp",
      alt: "Two-storey modern home with timber-slat balcony screens",
    },
  },
  {
    name: "Mabalacat City",
    slug: "mabalacat-city",
    description: "A city at Pampanga's northern edge.",
    scenery: {
      imagePath:
        "/media/properties/photography-v1/modern-filipino-smart-home/modern-filipino-smart-home-living-area.webp",
      alt: "Open-plan interior with a timber ceiling, broad windows and a kitchen counter",
    },
  },
  {
    name: "Magalang",
    slug: "magalang",
    description: "A municipality in northern Pampanga.",
    scenery: {
      imagePath:
        "/media/properties/photography-v1/furnished-brand-new-modern-home/furnished-brand-new-modern-home-kitchen-dining-mezzanine.png",
      alt: "Kitchen and dining area beneath an open mezzanine",
    },
  },
  {
    name: "Porac",
    slug: "porac",
    description: "A municipality in western Pampanga.",
    scenery: {
      imagePath:
        "/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-exterior-carport.png",
      alt: "Modern two-storey home with a covered carport",
    },
  },
].map((location) => ({ ...location, href: publicLocationCatalogPath(location.name) }));

/** The collection is independent of the permanent location navigation. */
export interface LocationsInventory {
  collection: CollectionState;
}

export type CollectionState =
  | { status: "ready"; items: readonly PublicPropertySummary[]; total: number }
  | { status: "unavailable" };
