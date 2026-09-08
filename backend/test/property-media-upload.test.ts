import { access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_PROPERTY_IMAGE_BYTES } from "@rc/shared";
import {
  inspectPropertyImage,
  parseImageUploadQuery,
} from "../src/modules/properties/property-media.validation.js";
import { LocalDevelopmentPropertyMediaStorage } from "../src/modules/properties/property-media.storage.js";

async function image(format: "png" | "jpeg" | "webp") {
  const pipeline = sharp({
    create: {
      width: 640,
      height: 800,
      channels: 3,
      background: { r: 58, g: 66, b: 79 },
    },
  });
  return format === "png"
    ? pipeline.png().toBuffer()
    : format === "jpeg"
      ? pipeline.jpeg().toBuffer()
      : pipeline.webp().toBuffer();
}

describe("property image upload validation", () => {
  it.each([
    ["png", "image/png"],
    ["jpeg", "image/jpeg"],
    ["webp", "image/webp"],
  ] as const)("accepts valid %s bytes", async (format, mimeType) => {
    await expect(
      inspectPropertyImage(await image(format), mimeType),
    ).resolves.toMatchObject({
      mimeType,
      width: 640,
      height: 800,
    });
  });

  it("rejects unsupported, mismatched, damaged, animated, and oversized uploads", async () => {
    await expect(
      inspectPropertyImage(Buffer.from("not an image"), "image/gif"),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      inspectPropertyImage(await image("png"), "image/jpeg"),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      inspectPropertyImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      inspectPropertyImage(Buffer.alloc(MAX_PROPERTY_IMAGE_BYTES + 1), "image/png"),
    ).rejects.toMatchObject({ status: 413 });
    const animated = await sharp({
      create: { width: 20, height: 40, channels: 4, background: "red" },
    })
      .gif({ pageHeight: 20 })
      .toBuffer();
    await expect(inspectPropertyImage(animated, "image/gif")).rejects.toMatchObject({
      status: 415,
    });
  });

  it("requires bounded metadata and never accepts a client filename or path", () => {
    expect(
      parseImageUploadQuery({ expectedVersion: "2", alt: "Front exterior" }),
    ).toEqual({
      expectedVersion: 2,
      alt: "Front exterior",
    });
    expect(() =>
      parseImageUploadQuery({
        expectedVersion: "2",
        alt: "Front exterior",
        filename: "../../hostile.exe",
      }),
    ).toThrow();
    expect(() =>
      parseImageUploadQuery({ expectedVersion: "-1", alt: "Image" }),
    ).toThrow();
    expect(() => parseImageUploadQuery({ expectedVersion: "1", alt: "" })).toThrow();
  });

  it("uses server-controlled UUID paths and removes local development artifacts", async () => {
    const bytes = await image("png");
    const inspected = await inspectPropertyImage(bytes, "image/png");
    const storage = new LocalDevelopmentPropertyMediaStorage();
    const stored = await storage.store(bytes, inspected);
    const uuid = stored.url.match(/^\/media\/properties\/([a-f0-9-]{36})\.webp$/)?.[1];

    expect(uuid).toBeDefined();
    expect(stored.id).toBe(`media-${uuid}`);
    const deliveryPath = path.join(
      process.cwd(),
      "frontend",
      "public",
      "media",
      "properties",
      `${uuid}.webp`,
    );
    const sourcePath = path.join(
      process.cwd(),
      "frontend",
      ".local-media-sources",
      `${uuid}.png`,
    );
    await expect(access(deliveryPath)).resolves.toBeUndefined();
    await expect(access(sourcePath)).resolves.toBeUndefined();

    await storage.remove(stored.url);
    await expect(access(deliveryPath)).rejects.toThrow();
    await expect(access(sourcePath)).rejects.toThrow();
  });
});
