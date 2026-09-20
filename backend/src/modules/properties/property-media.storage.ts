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
  | "storage_write_failed"
  | "transformation_failed"
  | "transformation_cleanup_failed"
  | "storage_delete_failed";

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

interface LocalPropertyMediaFileOperations {
  mkdir: typeof mkdir;
  writeFile: typeof writeFile;
  removeFile: typeof rm;
  transform(bytes: Buffer, deliveryPath: string): Promise<void>;
}

const localFileOperations: LocalPropertyMediaFileOperations = {
  mkdir,
  writeFile,
  removeFile: rm,
  async transform(bytes, deliveryPath) {
    await sharp(bytes)
      .rotate()
      .resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, effort: 4 })
      .toFile(deliveryPath);
  },
};

export class LocalDevelopmentPropertyMediaStorage implements PropertyMediaStorage {
  constructor(
    private readonly files: LocalPropertyMediaFileOperations = localFileOperations,
  ) {}

  owns(url: string): boolean {
    return /^\/media\/properties\/[a-f0-9-]{36}\.webp$/.test(url);
  }

  async store(bytes: Buffer, image: InspectedImage): Promise<StoredPropertyImage> {
    if (env.IS_PRODUCTION) {
      throw new HttpError(
        503,
        "Production property media storage is not configured.",
        undefined,
        true,
      );
    }
    const id = randomUUID();
    const sourcePath = path.join(SOURCE_ROOT, `${id}.${image.extension}`);
    const deliveryPath = path.join(PUBLIC_ROOT, `${id}.webp`);
    try {
      await Promise.all([
        this.files.mkdir(PUBLIC_ROOT, { recursive: true }),
        this.files.mkdir(SOURCE_ROOT, { recursive: true }),
      ]);
      await this.files.writeFile(sourcePath, bytes, { flag: "wx" });
    } catch (error) {
      throw new PropertyMediaStorageError("storage_write_failed", { cause: error });
    }
    try {
      await this.files.transform(bytes, deliveryPath);
    } catch (error) {
      const cleanup = await Promise.allSettled([
        this.files.removeFile(sourcePath, { force: true }),
        this.files.removeFile(deliveryPath, { force: true }),
      ]);
      const cleanupFailures = cleanup.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      );
      if (cleanupFailures.length > 0) {
        throw new PropertyMediaStorageError("transformation_cleanup_failed", {
          cause: new AggregateError(cleanupFailures, "Local media cleanup failed."),
        });
      }
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
      await this.files.removeFile(path.join(PUBLIC_ROOT, `${id}.webp`), {
        force: true,
      });
      for (const extension of ["png", "jpg", "webp"] as const) {
        await this.files.removeFile(path.join(SOURCE_ROOT, `${id}.${extension}`), {
          force: true,
        });
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
    throw new HttpError(
      503,
      "Production property media storage is not configured.",
      undefined,
      true,
    );
  }
  async remove(url: string): Promise<void> {
    if (this.owns(url)) {
      throw new HttpError(
        503,
        "Production property media storage is not configured.",
        undefined,
        true,
      );
    }
  }
}

export const propertyMediaStorage: PropertyMediaStorage = env.IS_PRODUCTION
  ? new UnavailablePropertyMediaStorage()
  : new LocalDevelopmentPropertyMediaStorage();
