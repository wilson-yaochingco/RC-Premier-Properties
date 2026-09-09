import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("property catalog error boundary", () => {
  it("describes a catalog failure rather than a single-property failure", async () => {
    const source = await readFile(
      resolve(process.cwd(), "frontend/src/app/properties/error.tsx"),
      "utf8",
    );

    expect(source).toContain("loading the property catalog");
    expect(source).not.toContain("loading this property");
  });
});
