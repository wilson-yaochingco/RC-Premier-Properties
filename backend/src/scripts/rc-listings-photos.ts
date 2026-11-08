import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { ListingPhoto, RcListing } from "./rc-premier-listings.js";

/**
 * Source photos from the business carry an identical contact strip (phone and email) baked in
 * near the bottom of a 1536x1920 frame. Its two icon discs rise to about y=1700 and its gold
 * rule begins at y=1724; pixels identical across different photos confirm nothing above 1700
 * belongs to the overlay. Cropping to 1688 px removes all of it and keeps the photograph above.
 */
const STRIP_FRAME = { width: 1536, height: 1920 } as const;
const CROP_HEIGHT = 1688;

export interface ListingPhotoBytes {
  bytes: Buffer;
  width: number;
  height: number;
  source: string;
}

export async function cropContactStrip(bytes: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(bytes).metadata();
  if (width !== STRIP_FRAME.width || height !== STRIP_FRAME.height) {
    throw new Error(
      `Expected a ${STRIP_FRAME.width}x${STRIP_FRAME.height} frame with the contact strip; got ${width}x${height}.`,
    );
  }
  return sharp(bytes)
    .extract({ left: 0, top: 0, width: STRIP_FRAME.width, height: CROP_HEIGHT })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
}

/** Reads the original untouched file; only the in-memory copy is ever cropped. */
export async function readListingPhoto(
  sourceRoot: string,
  listing: RcListing,
  photo: ListingPhoto,
): Promise<ListingPhotoBytes> {
  const directory = path.join(sourceRoot, listing.folder);
  const matches = (await readdir(directory)).filter((file) =>
    file.includes(`${photo.token}_`),
  );
  if (matches.length !== 1) {
    throw new Error(
      `${listing.folder}: expected one file for token ${photo.token}, found ${matches.length}.`,
    );
  }
  const source = path.join(directory, matches[0]!);
  const original = await readFile(source);
  const bytes = listing.cropContactStrip ? await cropContactStrip(original) : original;
  const { width, height } = await sharp(bytes).metadata();
  return { bytes, width: width ?? 0, height: height ?? 0, source };
}
