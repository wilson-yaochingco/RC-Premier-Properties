import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../src/services/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client deadlines", () => {
  it("turns a stalled request into a recoverable timeout error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      ),
    );

    await expect(apiRequest("/health", {}, 5)).rejects.toMatchObject({
      statusCode: 0,
      message: "The API request timed out. Try again.",
    });
  });

  it("preserves caller cancellation instead of converting it to a timeout", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      ),
    );

    const request = apiRequest("/health", { signal: controller.signal }, 1_000);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});
