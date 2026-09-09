import type { AdminInquirySummary, AdminPropertySummary } from "@rc/shared";
import { describe, expect, it } from "vitest";
import { inquiryPageCsv, propertyPageCsv } from "../src/features/admin/admin-csv";

const PROPERTY: AdminPropertySummary = {
  id: "property-record-id",
  propertyId: "RCPP-001",
  slug: "test-property",
  title: '=HYPERLINK("https://invalid.test")',
  purpose: "sale",
  propertyType: "house-and-lot",
  availability: "available",
  publicationStatus: "published",
  featured: false,
  price: { amount: 8_500_000, currency: "PHP", negotiable: false },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
  },
  shortDescription: "A synthetic test property.",
  publicationReadiness: { ready: true, missing: [] },
  version: 2,
  updatedAt: "2026-09-10T00:00:00.000Z",
};

const INQUIRY: AdminInquirySummary & { message: string; phone: string } = {
  id: "507f191e810c19729de860ea",
  name: " @SUM(1+1)",
  email: "staff-visible@example.test",
  phone: "+63 900 000 0000",
  message: "Private message body",
  inquiryType: "property",
  source: "property-detail",
  propertyId: "RCPP-001",
  status: "new",
  notification: { status: "retry-pending", attempts: 1 },
  version: 0,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
};

describe("bounded admin CSV exports", () => {
  it("adds a UTF-8 marker, quotes cells, and neutralizes spreadsheet formulas", () => {
    const csv = propertyPageCsv([PROPERTY]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""https://invalid.test"")"');
    expect(csv).not.toContain('"=HYPERLINK');
  });

  it("exports the explicit inquiry columns without message bodies or phone numbers", () => {
    const csv = inquiryPageCsv([INQUIRY]);

    expect(csv).toContain('"\' @SUM(1+1)"');
    expect(csv).toContain("staff-visible@example.test");
    expect(csv).not.toContain(INQUIRY.message);
    expect(csv).not.toContain(INQUIRY.phone);
  });
});
