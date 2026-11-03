import { describe, expect, it } from "vitest";
import { VIEWING_REQUEST_TIMES } from "@rc/shared";
import {
  TOUR_TIME_OPTIONS,
  isPropertyUnavailableError,
  tourTimeLabel,
} from "../src/features/inquiries/tour-request";
import { ApiClientError } from "../src/services/api-client";

describe("viewing request time options", () => {
  it("offer exactly the shared preferred times the backend accepts", () => {
    expect(TOUR_TIME_OPTIONS.map(([value]) => value)).toEqual([
      ...VIEWING_REQUEST_TIMES,
    ]);
    expect(TOUR_TIME_OPTIONS[0]).toEqual(["09:00", "9:00 AM"]);
    expect(TOUR_TIME_OPTIONS.at(-1)).toEqual(["16:00", "4:00 PM"]);
    expect(tourTimeLabel("12:30")).toBe("12:30 PM");
  });
});

describe("stale property rejection", () => {
  const rejection = (statusCode: number, fields: string[]) =>
    new ApiClientError({
      status: "error",
      statusCode,
      message: "Invalid viewing request.",
      issues: fields.map((field) => ({ field, message: "Rejected." })),
    });

  it("recognizes a property-only 400 as a property that no longer accepts requests", () => {
    expect(isPropertyUnavailableError(rejection(400, ["propertyId"]))).toBe(true);
  });

  it("leaves schedule, mixed, server and network failures as ordinary errors", () => {
    expect(isPropertyUnavailableError(rejection(400, ["requestedDate"]))).toBe(false);
    expect(isPropertyUnavailableError(rejection(400, ["propertyId", "phone"]))).toBe(
      false,
    );
    expect(isPropertyUnavailableError(rejection(400, []))).toBe(false);
    expect(isPropertyUnavailableError(rejection(503, ["propertyId"]))).toBe(false);
    expect(isPropertyUnavailableError(new TypeError("Failed to fetch"))).toBe(false);
  });
});
