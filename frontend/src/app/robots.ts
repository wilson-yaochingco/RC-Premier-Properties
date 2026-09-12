import type { MetadataRoute } from "next";
import { DEPLOYMENT_ENV, SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (DEPLOYMENT_ENV === "staging") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    ...(SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
