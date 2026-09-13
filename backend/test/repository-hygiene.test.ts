import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function ignored(path: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "--no-index", "--quiet", path], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

describe("repository credential-file hygiene", () => {
  it("ignores environment variants while retaining committed templates", () => {
    for (const path of [
      ".env",
      ".env.staging",
      "backend/.env.production",
      "backend/.env.staging",
      "backend/.env.test",
      "frontend/.env.production",
    ]) {
      expect(ignored(path), path).toBe(true);
    }

    expect(ignored("backend/.env.example")).toBe(false);
    expect(ignored("frontend/.env.example")).toBe(false);
  });
});
