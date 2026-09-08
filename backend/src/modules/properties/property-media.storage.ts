import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { HttpError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";
import type { InspectedImage } from "./property-media.validation.js";

export interface StoredPropertyImage {
  id: string;
  url: string;
}

export interface PropertyMediaStorage {
  store(bytes: Buffer, image: InspectedImage): Promise<StoredPropertyImage>;
  remove(url: string): Promise<void>;
}

const PUBLIC_ROOT = fileURLToPath(
  new URL("../../../../frontend/public/media/properties/", import.meta.url),
);
const SOURCE_ROOT = fileURLToPath(
  new URL("../../../../frontend/.local-media-sources/", import.meta.url),
);

export class LocalDevelopmentPropertyMediaStorage implements PropertyMediaStorage {
  async store(bytes: Buffer, image: InspectedImage): Promise<StoredPropertyImage> {
    if (env.IS_PRODUCTION) {
      throw new HttpError(503, "Production property media storage is not configured.");
    }
    const id = randomUUID();
    await Promise.all([
      mkdir(PUBLIC_ROOT, { recursive: true }),
      mkdir(SOURCE_ROOT, { recursive: true }),
    ]);
    const sourcePath = path.join(SOURCE_ROOT, `${id}.${image.extension}`);
    const deliveryPath = path.join(PUBLIC_ROOT, `${id}.webp`);
    await writeFile(sourcePath, bytes, { flag: "wx" });
    try {
      await sharp(bytes)
        .rotate()
        .resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88, effort: 4 })
        .toFile(deliveryPath);
    } catch (error) {
      await rm(sourcePath, { force: true });
      throw error;
    }
    return { id: `media-${id}`, url: `/media/properties/${id}.webp` };
  }

  async remove(url: string): Promise<void> {
    if (env.IS_PRODUCTION) return;
    const match = /^\/media\/properties\/([a-f0-9-]{36})\.webp$/.exec(url);
    if (!match?.[1]) return;
    const id = match[1];
    await rm(path.join(PUBLIC_ROOT, `${id}.webp`), { force: true });
    for (const extension of ["png", "jpg", "webp"] as const) {
      await rm(path.join(SOURCE_ROOT, `${id}.${extension}`), { force: true });
    }
  }
}

export class UnavailablePropertyMediaStorage implements PropertyMediaStorage {
  async store(): Promise<never> {
    throw new HttpError(503, "Production property media storage is not configured.");
  }
  async remove(): Promise<void> {}
}

export const propertyMediaStorage: PropertyMediaStorage = env.IS_PRODUCTION
  ? new UnavailablePropertyMediaStorage()
  : new LocalDevelopmentPropertyMediaStorage();
