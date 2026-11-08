import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinaryApi } from "cloudinary";
import sharp from "sharp";
import { HttpError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";
import type { InspectedImage } from "./property-media.validation.js";

export interface StoredPropertyImage {
  id: string;
  url: string;
  /** Provider object identifier, when the provider has one. */
  publicId?: string;
}

/** Where an upload belongs; adapters that organise objects use it, others ignore it. */
export interface PropertyMediaTarget {
  /** Property slug, used as the per-property folder. */
  folder: string;
  /** Alt text, used to give the object a descriptive name. */
  label: string;
  /** The label is already the intended file name: use it without a uniqueness suffix. */
  exactName?: boolean;
}

export interface PropertyMediaStorage {
  store(
    bytes: Buffer,
    image: InspectedImage,
    target?: PropertyMediaTarget,
  ): Promise<StoredPropertyImage>;
  /** Provider object identifier for a reference this adapter owns. */
  publicIdFor?(url: string): string | undefined;
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

/** Listing photography only; website imagery lives under `rc-premier-properties/website/`. */
export const CLOUDINARY_LISTINGS_FOLDER = "rc-premier-properties/listings";

interface UploadResult {
  public_id: string;
  secure_url: string;
}

/** The two SDK calls this adapter needs, so tests can substitute them. */
export interface CloudinaryClient {
  upload(bytes: Buffer, options: Record<string, unknown>): Promise<UploadResult>;
  destroy(publicId: string): Promise<{ result: string }>;
}

function sdkClient(config: NonNullable<typeof env.CLOUDINARY>): CloudinaryClient {
  cloudinaryApi.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return {
    upload: (bytes, options) =>
      new Promise((resolve, reject) => {
        cloudinaryApi.uploader
          .upload_stream(options, (error, result) =>
            error || !result
              ? reject(error ?? new Error("empty_result"))
              : resolve(result),
          )
          .end(bytes);
      }),
    destroy: (publicId) =>
      cloudinaryApi.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      }),
  };
}

/** Lowercase kebab-case, bounded, never empty. */
export function descriptiveName(label: string): string {
  const name = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
  return name || "photo";
}

export class CloudinaryPropertyMediaStorage implements PropertyMediaStorage {
  private readonly prefix: string;

  constructor(
    private readonly cloudName: string,
    private readonly client: CloudinaryClient,
  ) {
    this.prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  }

  /** Public ID for a reference inside the listings namespace; undefined for anything else. */
  publicIdFor(url: string): string | undefined {
    if (!url.startsWith(this.prefix) || url.includes("?") || url.includes("#")) {
      return undefined;
    }
    const path = url.slice(this.prefix.length).replace(/^v\d+\//, "");
    const publicId = path.replace(/\.[a-z0-9]{2,5}$/i, "");
    return publicId.startsWith(`${CLOUDINARY_LISTINGS_FOLDER}/`) &&
      !publicId.includes("..") &&
      /^[a-z0-9/_-]+$/.test(publicId)
      ? publicId
      : undefined;
  }

  owns(url: string): boolean {
    return this.publicIdFor(url) !== undefined;
  }

  async store(
    bytes: Buffer,
    _image: InspectedImage,
    target?: PropertyMediaTarget,
  ): Promise<StoredPropertyImage> {
    const folder = target?.folder
      ? `${CLOUDINARY_LISTINGS_FOLDER}/${descriptiveName(target.folder)}`
      : `${CLOUDINARY_LISTINGS_FOLDER}/unassigned`;
    const base = descriptiveName(target?.label ?? "photo");
    const name = target?.exactName ? base : `${base}-${randomBytes(3).toString("hex")}`;
    try {
      const result = await this.client.upload(bytes, {
        resource_type: "image",
        public_id: `${folder}/${name}`,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        timeout: 60_000,
      });
      if (!this.owns(result.secure_url)) {
        throw new Error("unexpected_delivery_url");
      }
      return {
        id: `media-${name}`,
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      throw new PropertyMediaStorageError("storage_write_failed", { cause: error });
    }
  }

  async remove(url: string): Promise<void> {
    const publicId = this.publicIdFor(url);
    if (!publicId) return;
    try {
      const { result } = await this.client.destroy(publicId);
      if (result !== "ok" && result !== "not found") throw new Error(result);
    } catch (error) {
      throw new PropertyMediaStorageError("storage_delete_failed", { cause: error });
    }
  }
}

function configuredCloudinaryStorage(): CloudinaryPropertyMediaStorage | undefined {
  const config = env.CLOUDINARY;
  return config
    ? new CloudinaryPropertyMediaStorage(config.cloudName, sdkClient(config))
    : undefined;
}

export const propertyMediaStorage: PropertyMediaStorage =
  configuredCloudinaryStorage() ??
  (env.IS_PRODUCTION
    ? new UnavailablePropertyMediaStorage()
    : new LocalDevelopmentPropertyMediaStorage());
