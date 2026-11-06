import { describe, expect, it } from "vitest";
import {
  addInputCalendarDays,
  businessDateInputValue,
  formatBusinessDate,
  formatBusinessDateTime,
  inputMonthDays,
  shiftInputMonth,
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

describe("viewing request calendar months", () => {
  it("lays out a month from its own weekday without browser timezone drift", () => {
    const { leading, days } = inputMonthDays("2026-11");
    expect(leading).toBe(0);
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-11-01");
    expect(days.at(-1)).toBe("2026-11-30");
    expect(inputMonthDays("2028-02").days).toHaveLength(29);
    expect(inputMonthDays("2026-12").leading).toBe(2);
  });

  it("moves across year boundaries", () => {
    expect(shiftInputMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftInputMonth("2027-01", -1)).toBe("2026-12");
  });
});
