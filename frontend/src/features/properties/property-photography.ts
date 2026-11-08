import type { PublicPropertyMedia } from "@rc/shared";

/** Reviewed delivery crops only; originals and stored media identifiers stay untouched. */
const REVIEWED_PHOTOS: Record<string, readonly string[]> = {
  "modern-filipino-smart-home": [
    "kitchen-dining-stairs",
    "garage",
    "entrance-door",
    "living-area-ceiling-fan",
    "bathroom",
  ],
  "furnished-korean-inspired-home": [
    "kitchen-dining",
    "kitchen",
    "bedroom-display-wall",
    "bedroom-balcony-door",
    "balcony",
  ],
  "furnished-brand-new-modern-home": [
    "kitchen",
    "bedroom-tv-wall",
    "bedroom-balcony-door",
    "bedroom-wardrobe",
    "bathroom",
  ],
  "brand-new-modern-two-storey-house": [
    "living-dining-stairs",
    "kitchen",
    "balcony",
    "bedroom-windows",
    "bathroom-vanity",
    "bedroom-balcony",
    "bathroom-shower",
  ],
  "brand-new-modern-family-home": [
    "living-dining-kitchen",
    "kitchen-breakfast-bar",
    "carport",
    "balcony",
    "bathroom-shower",
  ],
};

const SMALLER_CROPS = new Set([
  "furnished-korean-inspired-home/exterior-front",
  "furnished-korean-inspired-home/balcony-power-rack",
  "brand-new-modern-two-storey-house/exterior-front",
]);

// Pin local repairs to the inspected upload so a future replacement never receives an old edit.
const RETOUCHED_PHOTOS: Record<string, string> = {
  "modern-filipino-smart-home/exterior-front": "v1794116259/",
  "modern-filipino-smart-home/room-garden-door": "v1794116268/",
  "modern-filipino-smart-home/living-area": "v1794116261/",
  "furnished-korean-inspired-home/bedroom-grey-bed": "v1794116276/",
  "furnished-korean-inspired-home/living-room": "v1794116272/",
  "furnished-korean-inspired-home/bathroom": "v1794116281/",
  "furnished-brand-new-modern-home/living-room": "v1794118269/",
  "furnished-brand-new-modern-home/kitchen-dining-mezzanine": "v1794118274/",
  "furnished-brand-new-modern-home/exterior-front": "v1794118266/",
  "furnished-brand-new-modern-home/stairwell-window": "v1794118278/",
  "brand-new-modern-two-storey-house/bedroom-wardrobe": "v1794116289/",
  "brand-new-modern-family-home/second-floor-common-area": "v1794116302/",
  "brand-new-modern-family-home/staircase": "v1794116305/",
  "brand-new-modern-family-home/bedroom-wardrobe": "v1794116301/",
  "brand-new-modern-family-home/exterior-carport": "v1794116293/",
};

const OWNER_APPROVED_PNGS = new Set([
  "furnished-korean-inspired-home/living-room",
  "furnished-korean-inspired-home/bathroom",
  "furnished-brand-new-modern-home/kitchen-dining-mezzanine",
  "brand-new-modern-family-home/exterior-carport",
]);

function reviewedPhoto(url: string) {
  const match =
    /^(https:\/\/res\.cloudinary\.com\/dxevthllf\/image\/upload\/)(v\d+\/)?rc-premier-properties\/listings\/([^/]+)\/([^/]+)\.jpg$/.exec(
      url,
    );
  if (!match) return undefined;
  const [, prefix, version = "", slug, filename] = match;
  const name = filename.slice(slug.length + 1);
  if (!filename.startsWith(`${slug}-`)) return undefined;
  return { prefix, version, slug, name, filename };
}

export function propertyPhotoDeliveryUrl(url: string): string {
  const photo = reviewedPhoto(url);
  if (!photo) return url;
  const key = `${photo.slug}/${photo.name}`;
  const version = RETOUCHED_PHOTOS[key];
  if (version && (!photo.version || photo.version === version)) {
    const extension = OWNER_APPROVED_PNGS.has(key) ? "png" : "webp";
    return `/media/properties/photography-v1/${photo.slug}/${photo.filename}.${extension}`;
  }
  const top = SMALLER_CROPS.has(key)
    ? 200
    : REVIEWED_PHOTOS[photo.slug]?.includes(photo.name)
      ? 240
      : undefined;
  if (top === undefined) return url;
  return `${photo.prefix}c_crop,w_1536,h_${1688 - top},x_0,y_${top}/${photo.version}rc-premier-properties/listings/${photo.slug}/${photo.filename}.jpg`;
}

/** Lead with the reviewed interiors while retaining every assigned photograph in the viewer. */
export function orderPropertyPhotos(
  media: PublicPropertyMedia[],
): PublicPropertyMedia[] {
  const rank = (item: PublicPropertyMedia) => {
    const photo = item.url ? reviewedPhoto(item.url) : undefined;
    const index = photo ? REVIEWED_PHOTOS[photo.slug]?.indexOf(photo.name) : undefined;
    return index === undefined || index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...media].sort((left, right) => rank(left) - rank(right));
}
