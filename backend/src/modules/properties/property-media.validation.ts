import sharp, { type Metadata } from "sharp";
import { MAX_PROPERTY_IMAGE_BYTES, type UploadPropertyImageRequest } from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

export interface InspectedImage {
  mimeType: SupportedImageMimeType;
  extension: "png" | "jpg" | "webp";
  width: number;
  height: number;
}

function detectedType(bytes: Buffer): SupportedImageMimeType | undefined {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return undefined;
}

export async function inspectPropertyImage(
  bytes: Buffer,
  declaredMimeType: string | undefined,
): Promise<InspectedImage> {
  if (
    !SUPPORTED_IMAGE_MIME_TYPES.includes(declaredMimeType as SupportedImageMimeType)
  ) {
    throw new HttpError(415, "Upload a PNG, JPEG, or WebP image.");
  }
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new HttpError(400, "Choose an image to upload.");
  }
  if (bytes.length > MAX_PROPERTY_IMAGE_BYTES) {
    throw new HttpError(413, "Property images must be 12 MB or smaller.");
  }
  const actualMimeType = detectedType(bytes);
  if (!actualMimeType || actualMimeType !== declaredMimeType) {
    throw new HttpError(415, "The image contents do not match the declared file type.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, {
      failOn: "warning",
      limitInputPixels: 80_000_000,
    }).metadata();
  } catch {
    throw new HttpError(415, "The uploaded image is damaged or unsupported.");
  }
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > 12_000 ||
    metadata.height > 12_000
  ) {
    throw new HttpError(
      400,
      "Property images must have valid dimensions no larger than 12,000 pixels per side.",
    );
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new HttpError(415, "Animated images are not supported.");
  }
  return {
    mimeType: actualMimeType,
    extension:
      actualMimeType === "image/jpeg"
        ? "jpg"
        : actualMimeType === "image/png"
          ? "png"
          : "webp",
    width: metadata.width,
    height: metadata.height,
  };
}

function oneQueryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function parseImageUploadQuery(
  query: Record<string, unknown>,
): UploadPropertyImageRequest {
  const unknown = Object.keys(query).filter(
    (key) => !["expectedVersion", "alt", "caption"].includes(key),
  );
  if (unknown.length > 0) {
    throw new HttpError(400, "Invalid property image upload.", [
      { field: unknown[0] ?? "query", message: "Unknown field." },
    ]);
  }
  const expectedVersionText = oneQueryValue(query.expectedVersion);
  const alt = oneQueryValue(query.alt);
  const caption = oneQueryValue(query.caption);
  const expectedVersion =
    expectedVersionText === undefined ? NaN : Number(expectedVersionText);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new HttpError(400, "Invalid property image upload.", [
      { field: "expectedVersion", message: "Must be a non-negative integer." },
    ]);
  }
  if (!alt || alt.length > 240) {
    throw new HttpError(400, "Invalid property image upload.", [
      { field: "alt", message: "Describe the image in 240 characters or fewer." },
    ]);
  }
  if (caption && caption.length > 500) {
    throw new HttpError(400, "Invalid property image upload.", [
      { field: "caption", message: "Must be 500 characters or fewer." },
    ]);
  }
  return { expectedVersion, alt, ...(caption ? { caption } : {}) };
}
