import { describe, expect, it } from "vitest";
import {
  parseCreateInquiryBody,
  parseUpdateViewingRequestBody,
} from "../src/modules/inquiries/inquiry.validation.js";

const NOW = new Date("2026-09-07T01:00:00.000Z");

function viewingBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maria Viewer",
    email: "viewer@example.test",
    phone: "+63 917 555 0110",
    inquiryType: "viewing",
    source: "viewing-page",
    propertyId: "RCPP-ADMIN-001",
    requestedDate: "2026-09-08",
    requestedTime: "10:30",
    privacyConsent: true,
    ...overrides,
  };
}

describe("viewing request validation", () => {
  it("accepts a future Philippine-time request with an optional message", () => {
    expect(parseCreateInquiryBody(viewingBody(), NOW)).toMatchObject({
      data: {
        inquiryType: "viewing",
        propertyId: "RCPP-ADMIN-001",
        requestedDate: "2026-09-08",
        requestedTime: "10:30",
      },
      isHoneypotSubmission: false,
    });
  });

  it.each([
    [{ requestedDate: undefined }, "requestedDate"],
    [{ requestedDate: "2026-02-30" }, "requestedDate"],
    [{ requestedDate: "2026-09-06" }, "requestedDate"],
    [{ requestedTime: undefined }, "requestedTime"],
    [{ requestedTime: "25:10" }, "requestedTime"],
    [{ propertyId: undefined }, "propertyId"],
    [{ phone: undefined }, "phone"],
  ])("rejects invalid viewing input %#", (override, field) => {
    expect(() => parseCreateInquiryBody(viewingBody(override), NOW)).toThrowError(
      expect.objectContaining({
        status: 400,
        issues: expect.arrayContaining([expect.objectContaining({ field })]),
      }),
    );
  });

  it("rejects viewing fields on general inquiries", () => {
    expect(() =>
      parseCreateInquiryBody(
        {
          ...viewingBody(),
          inquiryType: "general",
          source: "contact-page",
          message: "Please answer this ordinary inquiry.",
        },
        NOW,
      ),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it("requires future schedules for confirmation but permits completion afterward", () => {
    expect(() =>
      parseUpdateViewingRequestBody(
        {
          status: "confirmed",
          requestedDate: "2026-09-06",
          requestedTime: "10:30",
          expectedVersion: 1,
        },
        NOW,
      ),
    ).toThrowError(expect.objectContaining({ status: 400 }));

    expect(
      parseUpdateViewingRequestBody(
        {
          status: "completed",
          requestedDate: "2026-09-06",
          requestedTime: "10:30",
          expectedVersion: 1,
        },
        NOW,
      ),
    ).toEqual({
      status: "completed",
      requestedDate: "2026-09-06",
      requestedTime: "10:30",
      expectedVersion: 1,
    });
  });
});
