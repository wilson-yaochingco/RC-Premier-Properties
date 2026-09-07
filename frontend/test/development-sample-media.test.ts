import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicPropertyMedia } from "@rc/shared";
import {
  DEVELOPMENT_SAMPLE_MEDIA,
  resolvePropertyMedia,
  selectDevelopmentSampleMedia,
} from "../src/features/properties/development-sample-media";

describe("development sample property media", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("selects the same curated sample for the same property identifier", () => {
    const first = selectDevelopmentSampleMedia("fixture-property-002");
    const second = selectDevelopmentSampleMedia("fixture-property-002");

    expect(second).toBe(first);
    expect(DEVELOPMENT_SAMPLE_MEDIA).toContain(first);
    expect(first.source).toBe("development-sample");
  });

  it("returns a labelled fallback in the development runtime", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { getDevelopmentSampleMedia } =
      await import("../src/features/properties/development-sample-media");

    expect(getDevelopmentSampleMedia("fixture-property-002")).toMatchObject({
      source: "development-sample",
      caption: expect.stringContaining("not an RC Premier Properties listing"),
    });
  });

  it("does not return an automatic fallback in the production runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { getDevelopmentSampleMedia } =
      await import("../src/features/properties/development-sample-media");

    expect(getDevelopmentSampleMedia("fixture-property-002")).toBeUndefined();
  });

  it("keeps explicitly assigned media authoritative", () => {
    const assigned: PublicPropertyMedia = {
      id: "assigned-media-001",
      kind: "image",
      url: "/media/properties/example/cover.webp",
      alt: "Explicitly assigned property exterior",
      source: "production",
    };

    const resolved = resolvePropertyMedia(assigned, "fixture-property-002");

    expect(resolved).toBe(assigned);
  });
});
