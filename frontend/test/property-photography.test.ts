import type { PublicPropertyMedia } from "@rc/shared";
import { describe, expect, it } from "vitest";
import {
  orderPropertyPhotos,
  propertyPhotoDeliveryUrl,
} from "../src/features/properties/property-photography";

const root = "https://res.cloudinary.com/dxevthllf/image/upload/";
const slug = "brand-new-modern-family-home";
const photo = (name: string, version = ""): PublicPropertyMedia => ({
  kind: "image",
  url: `${root}${version}rc-premier-properties/listings/${slug}/${slug}-${name}.jpg`,
  alt: name,
});

describe("reviewed property photography", () => {
  it.each([
    ["furnished-korean-inspired-home", "living-room", "v1794116272"],
    ["furnished-korean-inspired-home", "bathroom", "v1794116281"],
    ["furnished-brand-new-modern-home", "kitchen-dining-mezzanine", "v1794118274"],
    ["brand-new-modern-family-home", "exterior-carport", "v1794116293"],
  ])(
    "delivers owner-approved %s/%s PNG only for the reviewed upload",
    (slug, name, version) => {
      const original = `${root}rc-premier-properties/listings/${slug}/${slug}-${name}.jpg`;
      const delivery = `/media/properties/photography-v1/${slug}/${slug}-${name}.png`;
      expect(propertyPhotoDeliveryUrl(original)).toBe(delivery);
      expect(
        propertyPhotoDeliveryUrl(original.replace("upload/", `upload/${version}/`)),
      ).toBe(delivery);
      const replacement = original.replace("upload/", "upload/v9999999999/");
      expect(propertyPhotoDeliveryUrl(replacement)).toBe(replacement);
    },
  );

  it.each(["exterior-front", "room-garden-door"])(
    "delivers the accepted second-attempt %s repair without changing its source identity",
    (name) => {
      const original = `${root}rc-premier-properties/listings/modern-filipino-smart-home/modern-filipino-smart-home-${name}.jpg`;
      expect(propertyPhotoDeliveryUrl(original)).toBe(
        `/media/properties/photography-v1/modern-filipino-smart-home/modern-filipino-smart-home-${name}.webp`,
      );
    },
  );

  it("crops only reviewed photographs and preserves Cloudinary versions and IDs", () => {
    const original = photo("living-dining-kitchen", "v123/").url!;
    expect(propertyPhotoDeliveryUrl(original)).toBe(
      `${root}c_crop,w_1536,h_1448,x_0,y_240/v123/rc-premier-properties/listings/${slug}/${slug}-living-dining-kitchen.jpg`,
    );
    expect(propertyPhotoDeliveryUrl(photo("bedroom-wardrobe").url!)).toBe(
      "/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-bedroom-wardrobe.webp",
    );
    expect(
      propertyPhotoDeliveryUrl(photo("bedroom-wardrobe", "v9999999999/").url!),
    ).toBe(photo("bedroom-wardrobe", "v9999999999/").url);
    expect(propertyPhotoDeliveryUrl(photo("future-upload").url!)).toBe(
      photo("future-upload").url,
    );
    expect(
      propertyPhotoDeliveryUrl(original.replace("dxevthllf", "another-account")),
    ).toBe(original.replace("dxevthllf", "another-account"));
  });

  it("uses the smaller reviewed exterior crop without replacing stored IDs", () => {
    const original = `${root}v1794116271/rc-premier-properties/listings/furnished-korean-inspired-home/furnished-korean-inspired-home-exterior-front.jpg`;
    expect(propertyPhotoDeliveryUrl(original)).toBe(
      original.replace("upload/", "upload/c_crop,w_1536,h_1488,x_0,y_200/"),
    );
  });

  it("serves reviewed local retouches only for the inspected source version", () => {
    const original = photo("staircase").url!;
    expect(propertyPhotoDeliveryUrl(original)).toBe(
      "/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-staircase.webp",
    );
    expect(propertyPhotoDeliveryUrl(photo("staircase", "v9999999999/").url!)).toBe(
      photo("staircase", "v9999999999/").url,
    );
  });

  it("leads with clean interiors without losing, duplicating, or mutating assigned media", () => {
    const original = [
      photo("exterior-carport"),
      photo("balcony"),
      photo("living-dining-kitchen"),
    ];
    const ordered = orderPropertyPhotos(original);
    expect(ordered.map((item) => item.alt)).toEqual([
      "living-dining-kitchen",
      "balcony",
      "exterior-carport",
    ]);
    expect(original[0].alt).toBe("exterior-carport");
    expect(new Set(ordered).size).toBe(original.length);
  });
});
