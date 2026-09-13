import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../next.config.mjs";
import {
  resolveApiBaseUrl,
  resolveDeploymentEnvironment,
  resolveMapAttribution,
  resolveMapTileUrl,
  resolveMediaOrigin,
  resolveSiteUrl,
} from "../src/lib/env";

describe("frontend deployment environment", () => {
  it("distinguishes staging from the Next.js production build mode", () => {
    expect(resolveDeploymentEnvironment("staging", "production")).toBe("staging");
    expect(resolveDeploymentEnvironment(undefined, "test")).toBe("test");
    expect(resolveDeploymentEnvironment(undefined, "production")).toBe("test");
    expect(() => resolveDeploymentEnvironment("preview", "production")).toThrow(
      /NEXT_PUBLIC_DEPLOYMENT_ENV/,
    );
  });

  it("requires exact non-local HTTPS frontend and API origins for public deployments", () => {
    expect(resolveSiteUrl("https://properties.example.test", "production")).toBe(
      "https://properties.example.test",
    );
    expect(resolveApiBaseUrl("https://api.example.test", "staging")).toBe(
      "https://api.example.test",
    );

    for (const value of [
      undefined,
      "http://properties.example.test",
      "https://localhost",
      "https://properties.example.test/path",
      "https://user:password@properties.example.test",
    ]) {
      expect(resolveSiteUrl(value, "production")).toBeUndefined();
      expect(() => resolveApiBaseUrl(value, "production")).toThrow(
        /NEXT_PUBLIC_API_URL/,
      );
    }
  });

  it("requires provider-owned map configuration and plain-text attribution", () => {
    expect(
      resolveMapTileUrl("https://tiles.example.test/{z}/{x}/{y}.png", "production"),
    ).toContain("{z}/{x}/{y}");
    expect(
      resolveMapAttribution(
        "Approved map provider",
        "https://maps.example.test/attribution",
        "production",
      ),
    ).toEqual({
      text: "Approved map provider",
      url: "https://maps.example.test/attribution",
    });
    expect(() => resolveMapTileUrl(undefined, "production")).toThrow(
      /NEXT_PUBLIC_MAP_TILE_URL/,
    );
    expect(() =>
      resolveMapAttribution(
        "<script>unsafe</script>",
        "https://maps.example.test/attribution",
        "production",
      ),
    ).toThrow(/NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT/);
  });

  it("allows only one exact configured production media origin", () => {
    expect(resolveMediaOrigin("https://media.example.test", "production")).toBe(
      "https://media.example.test",
    );
    expect(() =>
      resolveMediaOrigin("https://media.example.test/path", "production"),
    ).toThrow(/NEXT_PUBLIC_MEDIA_ORIGIN/);
  });
});

describe("frontend content security policy", () => {
  it("allowlists only configured deployment resources", () => {
    const policy = buildContentSecurityPolicy({
      apiOrigin: "https://api.example.test",
      mapTileOrigin: "https://tiles.example.test",
      mediaOrigin: "https://media.example.test",
      upgradeInsecureRequests: true,
    });

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("connect-src 'self' https://api.example.test");
    expect(policy).toContain("https://tiles.example.test");
    expect(policy).toContain("https://media.example.test");
    expect(policy).toContain("frame-src https://www.youtube-nocookie.com");
    expect(policy).toContain("media-src 'self' https://videos.ctfassets.net");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toMatch(/(?:^|\s)\*(?:\s|$)/);
    expect(policy).not.toContain("https://attacker.invalid");
  });
});
