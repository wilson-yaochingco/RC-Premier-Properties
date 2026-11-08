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
    [{ name: "   " }, "name"],
    [{ name: "M" }, "name"],
    [{ phone: "not-a-phone" }, "phone"],
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

describe("public viewing schedule rules", () => {
  // 2026-09-07 09:00 in Manila (a Monday).
  const accepts = (overrides: Record<string, unknown>, now = NOW) =>
    expect(() => parseCreateInquiryBody(viewingBody(overrides), now)).not.toThrow();
  const rejects = (
    overrides: Record<string, unknown>,
    field: string,
    message: RegExp,
    now = NOW,
  ) =>
    expect(() => parseCreateInquiryBody(viewingBody(overrides), now)).toThrowError(
      expect.objectContaining({
        status: 400,
        issues: [
          expect.objectContaining({ field, message: expect.stringMatching(message) }),
        ],
      }),
    );

  it("rejects same-day requests even for a later time today", () => {
    rejects(
      { requestedDate: "2026-09-07", requestedTime: "16:00" },
      "requestedDate",
      /tomorrow/,
    );
  });

  it("accepts tomorrow and the 90-day boundary, and rejects day 91", () => {
    accepts({ requestedDate: "2026-09-08" });
    accepts({ requestedDate: "2026-12-06" });
    rejects({ requestedDate: "2026-12-07" }, "requestedDate", /within 90 days/);
  });

  it("accepts only the preferred 9:00 AM to 4:00 PM half-hour times", () => {
    for (const requestedTime of ["09:00", "12:00", "12:30", "16:00"])
      accepts({ requestedTime });
    for (const requestedTime of ["08:30", "09:15", "16:30", "23:45"]) {
      rejects({ requestedTime }, "requestedTime", /9:00 AM to 4:00 PM/);
    }
  });

  it("accepts weekends", () => {
    accepts({ requestedDate: "2026-09-12" });
    accepts({ requestedDate: "2026-09-13" });
  });

  it("counts days on the Philippine calendar across the UTC boundary", () => {
    // 23:59 on 7 September in Manila: tomorrow is still 8 September.
    const lateEvening = new Date("2026-09-07T15:59:00.000Z");
    accepts({ requestedDate: "2026-09-08" }, lateEvening);
    // 00:00 on 8 September in Manila, still 7 September in UTC.
    const midnight = new Date("2026-09-07T16:00:00.000Z");
    rejects({ requestedDate: "2026-09-08" }, "requestedDate", /tomorrow/, midnight);
    accepts({ requestedDate: "2026-09-09" }, midnight);
  });

  it("keeps staff rescheduling outside the public preferred-time set", () => {
    expect(
      parseUpdateViewingRequestBody(
        {
          status: "confirmed",
          requestedDate: "2026-09-07",
          requestedTime: "17:15",
          expectedVersion: 0,
        },
        NOW,
      ),
    ).toMatchObject({ requestedTime: "17:15" });
  });
});
