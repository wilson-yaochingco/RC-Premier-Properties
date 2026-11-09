import { getPropertyFacets } from "@/features/properties/property.service";
import { DEPLOYMENT_ENV, SITE_URL } from "@/lib/env";
import { OFFICIAL_EMAIL, OFFICIAL_PHONE } from "@/lib/public-contact";
import { publicLocationCatalogPath, shortPublicLocation } from "@/lib/public-location";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const PAGES = [
  [
    "/properties",
    "Properties for sale",
    "Published listings with price, type, location and availability.",
  ],
  [
    "/locations",
    "Locations",
    "Pampanga cities and municipalities with published inventory.",
  ],
  [
    "/book-viewing",
    "Book a viewing",
    "Request a date and time to see a property. Staff confirm every request.",
  ],
  [
    "/sell",
    "Sell a property",
    "Tell us about a property in Pampanga you may want to sell.",
  ],
  ["/contact", "Contact", "Ask about a listing or send a general inquiry."],
  [
    "/about",
    "About",
    "Who RC Premier Properties is and how it works with buyers and sellers.",
  ],
] as const;

const POLICIES = [
  [
    "/disclaimer",
    "Property disclaimer",
    "How to read listing prices, availability, measurements and photographs.",
  ],
  ["/privacy", "Privacy policy", "How inquiry details are collected and used."],
  [
    "/terms",
    "Terms of use",
    "What an inquiry or viewing request does and does not mean.",
  ],
] as const;

const link = ([path, name, note]: readonly [string, string, string]) =>
  `- [${name}](${SITE_URL}${path}): ${note}`;

/**
 * llms.txt (llmstxt.org): a plain summary of the site for AI assistants and answer engines.
 * It is guidance only; robots.txt and page metadata still decide what may be crawled and
 * indexed, so it is withheld wherever the site is not indexable.
 */
export async function GET(): Promise<Response> {
  if (!SITE_URL || DEPLOYMENT_ENV === "staging") {
    return new Response("Not found", { status: 404 });
  }

  const locations = await getPropertyFacets()
    .then(({ locationCounts = [] }) => locationCounts.filter(({ count }) => count > 0))
    .catch(() => []);

  const body = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Listings show the asking price, property type, city, specifications and availability (available, reserved or sold) as published by the business. Prices and availability are subject to confirmation. A viewing request or inquiry is a request only: it does not reserve a property or confirm an appointment. Images labelled as development samples are not photographs of that listing.",
    "",
    `Contact: ${OFFICIAL_EMAIL}, ${OFFICIAL_PHONE}. Service area: Pampanga, Philippines.`,
    "",
    "## Main pages",
    "",
    ...PAGES.map(link),
    ...(locations.length > 0
      ? [
          "",
          "## Locations with published properties",
          "",
          ...locations.map(
            ({ location, count }) =>
              `- [${shortPublicLocation(location)}](${SITE_URL}${publicLocationCatalogPath(location)}): ${count} published ${count === 1 ? "property" : "properties"}`,
          ),
        ]
      : []),
    "",
    "## Policies",
    "",
    ...POLICIES.map(link),
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE_URL}/sitemap.xml): every public listing and location page`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
