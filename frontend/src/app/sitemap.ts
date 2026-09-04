import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

const STATIC_ROUTES = [
  "",
  "/properties",
  "/about",
  "/contact",
  "/sell",
  "/book-viewing",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route, index) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: index < 2 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : index === 1 ? 0.9 : 0.7,
  }));
}
