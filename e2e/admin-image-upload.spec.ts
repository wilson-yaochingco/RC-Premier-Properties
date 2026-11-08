import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import {
  API_PREFIX,
  AUTH_PERMISSIONS,
  MAX_PROPERTY_IMAGE_BYTES,
  UPLOAD_REQUEST_TARGET_BYTES,
  type AdminPropertyDetail,
} from "@rc/shared";
import { startFixtureApi } from "./fixture-api.mjs";
import { inspectPropertyImage } from "../backend/src/modules/properties/property-media.validation.js";
import { createAuthCookieSettings } from "../backend/src/modules/auth/auth.cookies.js";
import { HttpError } from "../backend/src/middleware/errorHandler.js";
import type { AuthService } from "../backend/src/modules/auth/auth.service.js";
import type { AdminPropertyService } from "../backend/src/modules/properties/property.types.js";

test("large admin JPEG is prepared before the fixture API validates its bytes", async ({
  page,
  request,
}) => {
  const origin = "http://127.0.0.1:3100";
  const csrfToken = "image-upload-fixture-csrf";
  const id = "507f1f77bcf86cd799439011";
  const response = await request.get(
    `http://127.0.0.1:5051${API_PREFIX}/properties/clark-garden-residence`,
  );
  let property: AdminPropertyDetail = {
    ...(await response.json()),
    id,
    version: 0,
    publicationStatus: "draft",
    gallery: [],
    coverMedia: undefined,
    publicationReadiness: { ready: true, missing: [] },
  };
  let received:
    { bytes: number; width: number; height: number; mimeType: string } | undefined;
  let uploadRequests = 0;
  const cookies = createAuthCookieSettings(false, 60_000, 60_000);
  const server = await startFixtureApi({
    port: 5200,
    dependencies: {
      auth: {
        cookies,
        service: {
          async authenticate(token: string) {
            if (token !== "image-upload-fixture-session")
              throw new HttpError(401, "Authentication required.");
            return { staff: { id: "fixture-admin" } };
          },
          originAllowed: (value: string) => value === origin,
          csrfMatches: (_context: unknown, value: string) => value === csrfToken,
          async authorize() {},
        } as unknown as AuthService,
      },
      adminPropertyService: {
        async uploadImage(_id, input, bytes, mimeType) {
          const inspected = await inspectPropertyImage(bytes, mimeType);
          received = { bytes: bytes.length, ...inspected };
          property = {
            ...property,
            version: 1,
            gallery: [
              {
                id: "fixture-upload",
                kind: "image",
                url: "/media/properties/fixture.webp",
                alt: input.alt,
              },
            ],
          };
          return property;
        },
      } as AdminPropertyService,
    },
  });
  try {
    await page.context().addCookies([
      {
        name: cookies.sessionName,
        value: "image-upload-fixture-session",
        url: origin,
      },
    ]);
    await page.route(`**${API_PREFIX}/auth/session`, (route) =>
      route.fulfill({
        json: {
          authenticated: true,
          staff: { id: "fixture-admin", displayName: "Fixture Admin", role: "admin" },
          permissions: [...AUTH_PERMISSIONS],
          csrfToken,
        },
      }),
    );
    await page.route(`**${API_PREFIX}/admin/properties/${id}**`, async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: property });
      if (route.request().method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
            "Access-Control-Allow-Methods": "POST",
          },
        });
      const target = new URL(route.request().url());
      uploadRequests += 1;
      target.port = "5200";
      const uploaded = await route.fetch({ url: target.toString() });
      return route.fulfill({ response: uploaded });
    });
    const jpeg = await sharp(randomBytes(3200 * 2400 * 3), {
      raw: { width: 3200, height: 2400, channels: 3 },
    })
      .jpeg({ quality: 95 })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect(jpeg.length).toBeGreaterThan(UPLOAD_REQUEST_TARGET_BYTES);
    expect(jpeg.length).toBeLessThan(MAX_PROPERTY_IMAGE_BYTES);
    await page.goto(`/admin/properties/${id}/edit`);
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "large-home.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await page.getByLabel("Alternative text").fill("Large fixture photo");
    await page.getByRole("button", { name: "Upload Photos", exact: true }).click();
    await expect(page.getByText("Uploaded", { exact: true })).toBeVisible();
    expect(received).toMatchObject({
      width: 1920,
      height: 2560,
      mimeType: "image/webp",
    });
    expect(received!.bytes).toBeLessThanOrEqual(UPLOAD_REQUEST_TARGET_BYTES);

    await page.evaluate((target) => {
      const oversized = new Blob([new Uint8Array(target + 1)], { type: "image/webp" });
      HTMLCanvasElement.prototype.toBlob = (callback) => callback(oversized);
    }, UPLOAD_REQUEST_TARGET_BYTES);
    await page.locator('input[type="file"]').setInputFiles({
      name: "too-large-home.jpg",
      mimeType: "image/jpeg",
      buffer: jpeg,
    });
    const impossible = page
      .getByRole("listitem")
      .filter({ hasText: "too-large-home.jpg" });
    await impossible.getByLabel("Alternative text").fill("Photo that cannot fit");
    await page.getByRole("button", { name: "Upload Photos", exact: true }).click();
    await expect(impossible.getByRole("alert")).toContainText(
      "could not be reduced below 4 MiB",
    );
    expect(uploadRequests).toBe(1);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
});
