import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { resolveCloudinaryConfiguration } from "../src/config/env.js";
import {
  CLOUDINARY_LISTINGS_FOLDER,
  CloudinaryPropertyMediaStorage,
  PropertyMediaStorageError,
  descriptiveName,
  type CloudinaryClient,
} from "../src/modules/properties/property-media.storage.js";
import { cropContactStrip } from "../src/scripts/rc-listings-photos.js";
import { RC_PREMIER_LISTINGS } from "../src/scripts/rc-premier-listings.js";
import { parseCreateDraftPropertyBody } from "../src/modules/properties/property.validation.js";

const CLOUD = "demo-cloud";
const BASE = `https://res.cloudinary.com/${CLOUD}/image/upload`;
const IMAGE = {
  mimeType: "image/jpeg",
  extension: "jpg",
  width: 10,
  height: 10,
} as never;

function fakeClient(overrides: Partial<CloudinaryClient> = {}) {
  const upload = vi.fn<CloudinaryClient["upload"]>(async (_bytes, options) => ({
    public_id: String(options.public_id),
    secure_url: `${BASE}/v1/${String(options.public_id)}.jpg`,
  }));
  const destroy = vi.fn<CloudinaryClient["destroy"]>(async () => ({ result: "ok" }));
  const client: CloudinaryClient = { upload, destroy, ...overrides };
  return { client, upload, destroy };
}

describe("Cloudinary configuration", () => {
  const env = (values: Record<string, string>) => (name: string) => values[name];

  it("is absent when no value is set and ignored entirely under test", () => {
    expect(resolveCloudinaryConfiguration("development", env({}))).toBeUndefined();
    expect(
      resolveCloudinaryConfiguration(
        "test",
        env({
          CLOUDINARY_CLOUD_NAME: "x",
          CLOUDINARY_API_KEY: "k",
          CLOUDINARY_API_SECRET: "s",
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects a partial set without echoing any value", () => {
    expect(() =>
      resolveCloudinaryConfiguration(
        "development",
        env({ CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_SECRET: "super-secret" }),
      ),
    ).toThrow(/CLOUDINARY_API_KEY/);
    try {
      resolveCloudinaryConfiguration(
        "development",
        env({ CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_SECRET: "super-secret" }),
      );
    } catch (error) {
      expect(String(error)).not.toContain("super-secret");
    }
  });

  it("rejects a cloud name that is not a plain identifier", () => {
    expect(() =>
      resolveCloudinaryConfiguration(
        "development",
        env({
          CLOUDINARY_CLOUD_NAME: "Root Account",
          CLOUDINARY_API_KEY: "k",
          CLOUDINARY_API_SECRET: "s",
        }),
      ),
    ).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it("returns a complete configuration", () => {
    expect(
      resolveCloudinaryConfiguration(
        "production",
        env({
          CLOUDINARY_CLOUD_NAME: "demo",
          CLOUDINARY_API_KEY: "k",
          CLOUDINARY_API_SECRET: "s",
        }),
      ),
    ).toEqual({ cloudName: "demo", apiKey: "k", apiSecret: "s" });
  });
});

describe("descriptive object names", () => {
  it("produces bounded lowercase kebab-case and never an empty name", () => {
    expect(descriptiveName("Front exterior of a Modern Home!")).toBe(
      "front-exterior-of-a-modern-home",
    );
    expect(descriptiveName("  Café — Lanai  ")).toBe("cafe-lanai");
    expect(descriptiveName("!!!")).toBe("photo");
    expect(descriptiveName("a".repeat(200))).toHaveLength(90);
  });
});

describe("Cloudinary property media storage", () => {
  it("stores under the property folder with an exact descriptive name", async () => {
    const { client, upload } = fakeClient();
    const storage = new CloudinaryPropertyMediaStorage(CLOUD, client);

    const stored = await storage.store(Buffer.from("x"), IMAGE, {
      folder: "modern-filipino-smart-home",
      label: "modern-filipino-smart-home-living-area",
      exactName: true,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[1]).toMatchObject({
      resource_type: "image",
      public_id: `${CLOUDINARY_LISTINGS_FOLDER}/modern-filipino-smart-home/modern-filipino-smart-home-living-area`,
      overwrite: false,
    });
    expect(stored.publicId).toBe(
      `${CLOUDINARY_LISTINGS_FOLDER}/modern-filipino-smart-home/modern-filipino-smart-home-living-area`,
    );
    expect(stored.url.startsWith(`${BASE}/`)).toBe(true);
    expect(stored.id).toBe("media-modern-filipino-smart-home-living-area");
  });

  it("adds a short uniqueness suffix for admin uploads named from alt text", async () => {
    const { client, upload } = fakeClient();
    const storage = new CloudinaryPropertyMediaStorage(CLOUD, client);

    await storage.store(Buffer.from("x"), IMAGE, {
      folder: "a-home",
      label: "Kitchen island",
    });
    await storage.store(Buffer.from("x"), IMAGE, {
      folder: "a-home",
      label: "Kitchen island",
    });

    const [first, second] = upload.mock.calls.map((call) => String(call[1].public_id));
    expect(first).toMatch(
      /^rc-premier-properties\/listings\/a-home\/kitchen-island-[a-f0-9]{6}$/,
    );
    expect(first).not.toBe(second);
  });

  it("falls back to an unassigned folder without a target", async () => {
    const { client, upload } = fakeClient();
    await new CloudinaryPropertyMediaStorage(CLOUD, client).store(
      Buffer.from("x"),
      IMAGE,
    );
    expect(String(upload.mock.calls[0]?.[1].public_id)).toMatch(
      /^rc-premier-properties\/listings\/unassigned\/photo-[a-f0-9]{6}$/,
    );
  });

  it("surfaces an upload failure as a storage error without leaking the cause message", async () => {
    const { client } = fakeClient({
      upload: async () => {
        throw new Error("Invalid cloud_name Root");
      },
    });
    const failure = await new CloudinaryPropertyMediaStorage(CLOUD, client)
      .store(Buffer.from("x"), IMAGE, { folder: "a-home", label: "x" })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(PropertyMediaStorageError);
    expect(failure).toMatchObject({
      code: "storage_write_failed",
      message: "storage_write_failed",
    });
  });

  it("rejects a delivery URL outside the owned namespace", async () => {
    const { client } = fakeClient({
      upload: async () => ({
        public_id: "somewhere/else",
        secure_url:
          "https://res.cloudinary.com/other-cloud/image/upload/v1/somewhere/else.jpg",
      }),
    });
    await expect(
      new CloudinaryPropertyMediaStorage(CLOUD, client).store(Buffer.from("x"), IMAGE, {
        folder: "a-home",
        label: "x",
      }),
    ).rejects.toMatchObject({ code: "storage_write_failed" });
  });

  it("owns only plain delivery URLs inside the listings namespace of its own cloud", () => {
    const storage = new CloudinaryPropertyMediaStorage(CLOUD, fakeClient().client);
    const inside = `${BASE}/v1731000000/${CLOUDINARY_LISTINGS_FOLDER}/a-home/a-home-kitchen.jpg`;

    expect(storage.owns(inside)).toBe(true);
    expect(storage.publicIdFor(inside)).toBe(
      `${CLOUDINARY_LISTINGS_FOLDER}/a-home/a-home-kitchen`,
    );
    expect(
      storage.owns(`${BASE}/${CLOUDINARY_LISTINGS_FOLDER}/a-home/a-home-kitchen.jpg`),
    ).toBe(true);

    for (const outside of [
      `https://res.cloudinary.com/other-cloud/image/upload/v1/${CLOUDINARY_LISTINGS_FOLDER}/a.jpg`,
      `${BASE}/v1/rc-premier-properties/website/hero.jpg`,
      `${BASE}/f_auto,w_800/v1/${CLOUDINARY_LISTINGS_FOLDER}/a.jpg`,
      `${inside}?download=1`,
      `${BASE}/v1/${CLOUDINARY_LISTINGS_FOLDER}/../../secret.jpg`,
      "/media/properties/00000000-0000-0000-0000-000000000000.webp",
    ]) {
      expect(storage.owns(outside), outside).toBe(false);
    }
  });

  it("deletes only owned references and treats an already-missing object as removed", async () => {
    const { client, destroy } = fakeClient();
    const storage = new CloudinaryPropertyMediaStorage(CLOUD, client);

    await storage.remove(`${BASE}/v1/rc-premier-properties/website/hero.jpg`);
    expect(destroy).not.toHaveBeenCalled();

    destroy.mockResolvedValueOnce({ result: "not found" });
    await storage.remove(
      `${BASE}/v1/${CLOUDINARY_LISTINGS_FOLDER}/a-home/a-home-kitchen.jpg`,
    );
    expect(destroy).toHaveBeenCalledWith(
      `${CLOUDINARY_LISTINGS_FOLDER}/a-home/a-home-kitchen`,
    );

    destroy.mockResolvedValueOnce({ result: "error" });
    await expect(
      storage.remove(
        `${BASE}/v1/${CLOUDINARY_LISTINGS_FOLDER}/a-home/a-home-kitchen.jpg`,
      ),
    ).rejects.toMatchObject({ code: "storage_delete_failed" });
  });
});

describe("contact-strip crop", () => {
  const frame = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: "#888" } })
      .jpeg()
      .toBuffer();

  it("removes only the lower overlay band of a 1536x1920 source", async () => {
    const cropped = await sharp(
      await cropContactStrip(await frame(1536, 1920)),
    ).metadata();
    expect([cropped.width, cropped.height]).toEqual([1536, 1688]);
  });

  it("refuses any frame it was not measured against", async () => {
    await expect(cropContactStrip(await frame(1280, 960))).rejects.toThrow(/1536x1920/);
  });
});

describe("prepared RC Premier listings", () => {
  const publishable = RC_PREMIER_LISTINGS.filter((listing) => listing.content);

  it("prepares all six listings, none held", () => {
    expect(RC_PREMIER_LISTINGS).toHaveLength(6);
    expect(publishable).toHaveLength(6);
    expect(RC_PREMIER_LISTINGS.some((listing) => listing.hold)).toBe(false);
  });

  it("passes the same validation as the admin create endpoint", () => {
    for (const { content } of publishable) {
      expect(() => parseCreateDraftPropertyBody(content)).not.toThrow();
    }
  });

  it("never exposes a precise location and only uses the four location guides", () => {
    for (const { content } of publishable) {
      expect(content!.location.publicPrecision).toBe("city-only");
      expect(content!.location).not.toHaveProperty("coordinates");
      expect(content!.location).not.toHaveProperty("privateAddress");
      expect([
        "Angeles City",
        "Mabalacat City",
        "City of San Fernando",
        "Porac",
      ]).toContain(content!.location.city);
    }
  });

  it("has unique identifiers, slugs, photo tokens and descriptive file names", () => {
    const ids = publishable.map((l) => l.content!.propertyId);
    const slugs = publishable.map((l) => l.content!.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const listing of RC_PREMIER_LISTINGS) {
      const tokens = listing.photos.map((p) => p.token);
      const names = listing.photos.map((p) => p.name);
      expect(new Set(tokens).size, listing.folder).toBe(tokens.length);
      expect(new Set(names).size, listing.folder).toBe(names.length);
      for (const photo of listing.photos) {
        expect(photo.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(photo.alt.length).toBeGreaterThan(20);
        expect(photo.alt.length).toBeLessThanOrEqual(240);
      }
    }
  });

  it("keeps alt text free of provisional locations", () => {
    const cities = ["Angeles", "Mabalacat", "San Fernando", "Porac", "Pampanga"];
    for (const listing of RC_PREMIER_LISTINGS) {
      for (const photo of listing.photos) {
        for (const city of cities) expect(photo.alt).not.toContain(city);
      }
    }
  });
});
