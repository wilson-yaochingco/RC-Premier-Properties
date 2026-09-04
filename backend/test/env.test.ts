import { describe, expect, it } from "vitest";
import { normalizeCorsOrigin } from "../src/config/env.js";

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
