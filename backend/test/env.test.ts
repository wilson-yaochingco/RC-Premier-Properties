import { describe, expect, it } from "vitest";
import {
  normalizeAuthCallbackUrl,
  normalizeAuthIssuerUrl,
  normalizeAuthReturnUrls,
  normalizeCorsOrigin,
  validateAuthTransportSecurity,
} from "../src/config/env.js";

describe("CORS origin configuration", () => {
  it("accepts and normalizes one HTTP(S) origin", () => {
    expect(normalizeCorsOrigin(" https://properties.example.test/ ")).toBe(
      "https://properties.example.test",
    );
    expect(normalizeCorsOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("rejects wildcards and values that are not a single origin", () => {
    for (const value of [
      "*",
      "https://properties.example.test/path",
      "https://properties.example.test?preview=true",
      "file:///tmp/site",
      "not-an-origin",
    ]) {
      expect(() => normalizeCorsOrigin(value)).toThrow(/Invalid CORS_ORIGIN/);
    }
  });
});

describe("authentication URL configuration", () => {
  it("normalizes the HTTPS issuer and exact callback URL", () => {
    expect(normalizeAuthIssuerUrl("https://tenant.us.auth0.com")).toBe(
      "https://tenant.us.auth0.com/",
    );
    expect(normalizeAuthCallbackUrl("http://localhost:5000/api/v1/auth/callback")).toBe(
      "http://localhost:5000/api/v1/auth/callback",
    );
  });

  it("rejects insecure issuers and callback URLs with query data", () => {
    expect(() => normalizeAuthIssuerUrl("http://tenant.auth0.com")).toThrow(
      /AUTH0_ISSUER_URL/,
    );
    expect(() =>
      normalizeAuthCallbackUrl(
        "http://localhost:5000/api/v1/auth/callback?secret=value",
      ),
    ).toThrow(/AUTH0_CALLBACK_URL/);
  });

  it("accepts only exact return URLs on the configured frontend origin", () => {
    expect(
      normalizeAuthReturnUrls(
        "http://localhost:3000/admin,http://localhost:3000/admin/security",
        "http://localhost:3000",
      ),
    ).toEqual(["http://localhost:3000/admin", "http://localhost:3000/admin/security"]);
    expect(() =>
      normalizeAuthReturnUrls(
        "https://attacker.invalid/admin",
        "http://localhost:3000",
      ),
    ).toThrow(/AUTH_ALLOWED_RETURN_URLS/);
  });

  it("requires HTTPS browser and callback URLs in production", () => {
    expect(() =>
      validateAuthTransportSecurity(
        "production",
        "https://properties.example.test",
        "https://api.example.test/api/v1/auth/callback",
        ["https://properties.example.test/admin"],
      ),
    ).not.toThrow();
    expect(() =>
      validateAuthTransportSecurity(
        "production",
        "https://properties.example.test",
        "http://api.example.test/api/v1/auth/callback",
        ["https://properties.example.test/admin"],
      ),
    ).toThrow(/requires HTTPS/);
    expect(() =>
      validateAuthTransportSecurity(
        "development",
        "http://localhost:3000",
        "http://localhost:5000/api/v1/auth/callback",
        ["http://localhost:3000/admin"],
      ),
    ).not.toThrow();
  });
});
