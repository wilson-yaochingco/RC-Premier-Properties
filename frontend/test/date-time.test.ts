import { describe, expect, it } from "vitest";
import { formatBusinessDate, formatBusinessDateTime } from "../src/lib/date-time";

describe("business timestamp formatting", () => {
  it("uses Philippine time consistently across a UTC midnight boundary", () => {
    const instant = "2026-09-09T16:30:00.000Z";
    expect(formatBusinessDate(instant)).toContain("Sep 10, 2026");
    expect(formatBusinessDateTime(instant)).toContain("Sep 10, 2026");
    expect(formatBusinessDateTime(instant)).toMatch(/12:30\s*AM/i);
  });
});
