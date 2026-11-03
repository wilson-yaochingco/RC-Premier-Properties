import { describe, expect, it } from "vitest";
import { VIEWING_REQUEST_TIMES } from "@rc/shared";
import {
  TOUR_TIME_OPTIONS,
  tourTimeLabel,
} from "../src/features/inquiries/tour-request";

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
