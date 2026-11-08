/**
 * DEVELOPMENT PREVIEW ONLY: `npm run preview:api`.
 *
 * Serves the six prepared RC Premier listings through the Playwright fixture API, which mounts
 * the real compiled Express app with in-memory services. No database is opened, nothing is
 * written anywhere, and inquiries are acknowledged in memory without being sent. Records are
 * built at start-up from `backend/src/scripts/rc-premier-listings.ts`, the same source the
 * database import uses, and point at the photographs already stored in Cloudinary.
 *
 * Every listing is shown as published here only so the public pages can be reviewed locally.
 * Cities are owner-confirmed; showing a listing here is not a publication decision.
 * Stop `npm run dev:backend` first: the preview takes its port (5000) so the frontend needs
 * no configuration change.
 */
import type { PublicPropertyDetail, PublicPropertyMedia } from "@rc/shared";
import assert from "node:assert/strict";
import { RC_PREMIER_LISTINGS } from "../backend/src/scripts/rc-premier-listings.ts";
import photoDecisions from "../docs/development/property-photography/decisions.json" with { type: "json" };

const CLOUDINARY = "https://res.cloudinary.com/dxevthllf/image/upload";
// Presentation choice for the homepage preview only; production featuring is an admin action.
const FEATURED = new Set([
  "PREMIER_PROPERTY_9",
  "PREMIER_PROPERTY_3",
  "PREMIER_PROPERTY_7",
]);
const APPROVED_PREVIEW_IDS = new Set(
  [3, 7, 8, 9, 10, 11].map((id) => `PREMIER_PROPERTY_${id}`),
);
const heldPhotoTokens = new Set(
  photoDecisions
    .filter((photo) => photo.decision === "review" || photo.decision === "exclude")
    .map((photo) => photo.token),
);

const properties: PublicPropertyDetail[] = RC_PREMIER_LISTINGS.filter((listing) =>
  APPROVED_PREVIEW_IDS.has(listing.content?.propertyId ?? ""),
).map((listing, index) => {
  const content = listing.content;
  if (!content) throw new Error(`${listing.folder} has no listing content.`);
  const gallery: PublicPropertyMedia[] = listing.photos
    .filter((photo) => !heldPhotoTokens.has(photo.token))
    .map((photo) => ({
      id: `${content.slug}-${photo.name}`,
      kind: "image",
      url: `${CLOUDINARY}/rc-premier-properties/listings/${content.slug}/${content.slug}-${photo.name}.jpg`,
      alt: photo.alt,
      source: "production",
      focalPoint: { x: 50, y: 50 },
    }));
  assert(
    gallery.length >= 5,
    `${content.propertyId} needs sufficient reviewed photography.`,
  );
  const published = new Date(Date.UTC(2026, 10, 1 + index)).toISOString();
  return {
    id: `preview-${content.propertyId.toLowerCase()}`,
    propertyId: content.propertyId,
    slug: content.slug,
    title: content.title,
    purpose: "sale",
    propertyType: content.propertyType,
    availability: "available",
    featured: FEATURED.has(content.propertyId),
    price: { ...content.price, currency: "PHP" },
    // City-only precision: the development name and any point stay private.
    location: {
      province: content.location.province,
      city: content.location.city,
      publicPrecision: "city-only",
      disclosure: "general-area",
    },
    specifications: content.specifications,
    shortDescription: content.shortDescription,
    description: content.description,
    highlights: content.highlights,
    amenities: content.amenities,
    features: content.features,
    coverMedia: gallery[0],
    gallery,
    publishedAt: published,
    updatedAt: published,
  };
});

assert.equal(
  properties.length,
  6,
  "The local preview requires all six official listings.",
);
assert.equal(new Set(properties.map((property) => property.propertyId)).size, 6);
assert.equal(
  properties.reduce((count, property) => count + property.gallery.length, 0),
  66 - heldPhotoTokens.size,
);

// The fixture API imports the backend, which reads its environment on load: keep it local,
// database-free and unauthenticated. No .env file is consulted for secrets here.
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017/rc-premier-preview-unused",
  CORS_ORIGIN: "http://localhost:3000",
  AUTH0_ISSUER_URL: "",
  AUTH0_CLIENT_ID: "",
  AUTH0_CLIENT_SECRET: "",
  AUTH0_CALLBACK_URL: "",
  AUTH_ALLOWED_RETURN_URLS: "",
  AUTH_SESSION_HASH_SECRET: "",
});

const { startFixtureApi } = await import("./fixture-api.mjs");
await startFixtureApi({
  properties,
  host: "127.0.0.1",
  port: Number(process.env.PREVIEW_API_PORT ?? 5000),
  label: "RC Premier local preview",
}).catch((error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      "Port 5000 is in use. Stop `npm run dev:backend` and run this again.",
    );
    process.exit(1);
  }
  throw error;
});
console.log(
  `${properties.length} listings: ${properties.map((p) => p.propertyId).join(", ")}`,
);
