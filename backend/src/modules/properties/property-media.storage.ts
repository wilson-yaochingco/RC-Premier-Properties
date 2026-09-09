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
  /** True only for references inside the adapter's reviewed storage namespace. */
  owns?(url: string): boolean;
}

export type PropertyMediaStorageErrorCode =
  "storage_write_failed" | "transformation_failed" | "storage_delete_failed";

export class PropertyMediaStorageError extends Error {
  constructor(
    public readonly code: PropertyMediaStorageErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "PropertyMediaStorageError";
  }
}

export function propertyMediaStorageErrorCode(error: unknown): string {
  return error instanceof PropertyMediaStorageError
    ? error.code
    : error instanceof HttpError && error.status === 503
      ? "storage_unavailable"
      : "storage_operation_failed";
}

const PUBLIC_ROOT = fileURLToPath(
  new URL("../../../../frontend/public/media/properties/", import.meta.url),
);
const SOURCE_ROOT = fileURLToPath(
  new URL("../../../../frontend/.local-media-sources/", import.meta.url),
);

export class LocalDevelopmentPropertyMediaStorage implements PropertyMediaStorage {
  owns(url: string): boolean {
    return /^\/media\/properties\/[a-f0-9-]{36}\.webp$/.test(url);
  }

  async store(bytes: Buffer, image: InspectedImage): Promise<StoredPropertyImage> {
    if (env.IS_PRODUCTION) {
      throw new HttpError(503, "Production property media storage is not configured.");
    }
    const id = randomUUID();
    const sourcePath = path.join(SOURCE_ROOT, `${id}.${image.extension}`);
    const deliveryPath = path.join(PUBLIC_ROOT, `${id}.webp`);
    try {
      await Promise.all([
        mkdir(PUBLIC_ROOT, { recursive: true }),
        mkdir(SOURCE_ROOT, { recursive: true }),
      ]);
      await writeFile(sourcePath, bytes, { flag: "wx" });
    } catch (error) {
      throw new PropertyMediaStorageError("storage_write_failed", { cause: error });
    }
    try {
      await sharp(bytes)
        .rotate()
        .resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88, effort: 4 })
        .toFile(deliveryPath);
    } catch (error) {
      await Promise.allSettled([
        rm(sourcePath, { force: true }),
        rm(deliveryPath, { force: true }),
      ]);
      throw new PropertyMediaStorageError("transformation_failed", { cause: error });
    }
    return { id: `media-${id}`, url: `/media/properties/${id}.webp` };
  }

  async remove(url: string): Promise<void> {
    if (env.IS_PRODUCTION) return;
    if (!this.owns(url)) return;
    const match = /^\/media\/properties\/([a-f0-9-]{36})\.webp$/.exec(url);
    if (!match?.[1]) return;
    const id = match[1];
    try {
      await rm(path.join(PUBLIC_ROOT, `${id}.webp`), { force: true });
      for (const extension of ["png", "jpg", "webp"] as const) {
        await rm(path.join(SOURCE_ROOT, `${id}.${extension}`), { force: true });
      }
    } catch (error) {
      throw new PropertyMediaStorageError("storage_delete_failed", { cause: error });
    }
  }
}

export class UnavailablePropertyMediaStorage implements PropertyMediaStorage {
  owns(url: string): boolean {
    if (!env.MEDIA_PUBLIC_ORIGIN) return false;
    try {
      return new URL(url).origin === env.MEDIA_PUBLIC_ORIGIN;
    } catch {
      return false;
    }
  }
  async store(): Promise<never> {
    throw new HttpError(503, "Production property media storage is not configured.");
  }
  async remove(url: string): Promise<void> {
    if (this.owns(url)) {
      throw new HttpError(503, "Production property media storage is not configured.");
    }
  }
}

export const propertyMediaStorage: PropertyMediaStorage = env.IS_PRODUCTION
  ? new UnavailablePropertyMediaStorage()
  : new LocalDevelopmentPropertyMediaStorage();
