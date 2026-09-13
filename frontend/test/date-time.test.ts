import { describe, expect, it } from "vitest";
import {
  addInputCalendarDays,
  businessDateInputValue,
  formatBusinessDate,
  formatBusinessDateTime,
} from "../src/lib/date-time";

describe("business timestamp formatting", () => {
  it("uses Philippine time consistently across a UTC midnight boundary", () => {
    const instant = "2026-09-09T16:30:00.000Z";
    expect(formatBusinessDate(instant)).toContain("Sep 10, 2026");
    expect(formatBusinessDateTime(instant)).toContain("Sep 10, 2026");
    expect(formatBusinessDateTime(instant)).toMatch(/12:30\s*AM/i);
  });

  it("builds tour calendar values from the Philippine date", () => {
    const instant = new Date("2026-09-09T16:30:00.000Z");
    expect(businessDateInputValue(instant)).toBe("2026-09-10");
    expect(addInputCalendarDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});
