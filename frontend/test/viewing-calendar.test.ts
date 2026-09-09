import { describe, expect, it } from "vitest";
import {
  calendarWindow,
  currentBusinessMonth,
  monthLabel,
  shiftMonth,
} from "../src/features/admin/viewing-calendar";

describe("admin viewing calendar", () => {
  it("uses the Philippine business month at UTC date boundaries", () => {
    expect(currentBusinessMonth(new Date("2026-08-31T16:30:00.000Z"))).toBe("2026-09");
  });

  it("builds a deterministic six-week Sunday-to-Saturday range", () => {
    const window = calendarWindow("2026-09");

    expect(window.days).toHaveLength(42);
    expect(window).toMatchObject({
      month: "2026-09",
      start: "2026-08-30",
      end: "2026-10-10",
    });
    expect(monthLabel(window.month)).toBe("September 2026");
  });

  it("shifts across year boundaries and rejects invalid months", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(() => calendarWindow("2026-13")).toThrow("Invalid calendar month");
  });
});
