import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("property catalog error boundary", () => {
  it("describes a catalog failure in public terms, not as a single-property failure", async () => {
    const source = await readFile(
      resolve(process.cwd(), "frontend/src/app/properties/error.tsx"),
      "utf8",
    );

    expect(source).toContain("Properties are temporarily unavailable.");
    expect(source).not.toContain("loading this property");
  });
});
