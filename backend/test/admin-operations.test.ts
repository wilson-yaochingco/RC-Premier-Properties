import { RESIDENTIAL_SALE_PROPERTY_TYPES } from "@rc/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SecurityAuditEventModel } from "../src/modules/auth/security-audit-event.model.js";
import { InquiryModel } from "../src/modules/inquiries/inquiry.model.js";
import { MongooseAdminOperationsService } from "../src/modules/operations/admin-operations.service.js";
import {
  parseAdminAuditQuery,
  parseAdminStaffQuery,
  parseViewingCalendarQuery,
} from "../src/modules/operations/admin-operations.validation.js";
import { PropertyModel } from "../src/modules/properties/property.model.js";
import { PropertyMediaCleanupTaskModel } from "../src/modules/properties/property-media-cleanup.model.js";

function readQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

afterEach(() => vi.restoreAllMocks());

describe("admin operations validation", () => {
  it("accepts only a real viewing range of at most 42 days", () => {
    expect(
      parseViewingCalendarQuery({ start: "2026-09-01", end: "2026-10-12" }),
    ).toEqual({ start: "2026-09-01", end: "2026-10-12" });
    expect(() =>
      parseViewingCalendarQuery({ start: "2026-09-01", end: "2026-10-13" }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() =>
      parseViewingCalendarQuery({
        start: ["2026-09-01", "2026-09-02"],
        end: "2026-09-30",
      }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it("bounds staff and audit pagination and rejects unknown filters", () => {
    expect(parseAdminStaffQuery({ query: " Admin ", status: "active" })).toEqual({
      query: "Admin",
      status: "active",
      page: 1,
      limit: 25,
    });
    expect(() => parseAdminStaffQuery({ limit: "51" })).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
    expect(() => parseAdminAuditQuery({ details: "private" })).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });
});

describe("admin dashboard queries", () => {
  it("uses aggregate counts, a six-record upcoming projection, and no customer PII", async () => {
    const upcoming = readQuery([
      {
        _id: "507f191e810c19729de860ea",
        propertyId: "RCPP-001",
        viewingRequest: {
          status: "confirmed",
          requestedDate: "2026-10-01",
          requestedTime: "10:00",
        },
      },
    ]);
    const propertyAggregate = vi.spyOn(PropertyModel, "aggregate").mockResolvedValue([
      {
        _id: null,
        published: 4,
        draft: 2,
        unpublished: 1,
        available: 2,
        reserved: 1,
        sold: 1,
      },
    ] as never);
    vi.spyOn(InquiryModel, "aggregate").mockResolvedValue([
      {
        _id: null,
        active: 6,
        new: 3,
        retryPending: 1,
        terminalFailure: 2,
      },
    ] as never);
    const find = vi.spyOn(InquiryModel, "find").mockReturnValue(upcoming as never);
    vi.spyOn(InquiryModel, "countDocuments").mockResolvedValue(7);
    vi.spyOn(PropertyMediaCleanupTaskModel, "countDocuments").mockResolvedValue(2);

    const result = await new MongooseAdminOperationsService().dashboard();

    expect(result).toMatchObject({
      properties: {
        published: 4,
        draft: 2,
        unpublished: 1,
        available: 2,
        reserved: 1,
        sold: 1,
      },
      inquiries: { active: 6, new: 3 },
      notifications: { retryPending: 1, terminalFailure: 2 },
      upcomingViewingCount: 7,
      mediaCleanupDebtCount: 2,
    });
    expect(result.upcomingViewings).toEqual([
      {
        inquiryId: "507f191e810c19729de860ea",
        propertyId: "RCPP-001",
        status: "confirmed",
        requestedDate: "2026-10-01",
        requestedTime: "10:00",
      },
    ]);
    expect(propertyAggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          $match: {
            purpose: "sale",
            propertyType: { $in: RESIDENTIAL_SALE_PROPERTY_TYPES },
          },
        },
      ]),
    );
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        archivedAt: { $exists: false },
        inquiryType: "viewing",
      }),
    );
    expect(upcoming.select).toHaveBeenCalledWith(
      "propertyId viewingRequest.status viewingRequest.requestedDate viewingRequest.requestedTime",
    );
    expect(upcoming.select.mock.calls[0]?.[0]).not.toMatch(/name|email|phone|message/);
    expect(upcoming.limit).toHaveBeenCalledWith(6);
  });

  it("caps calendar responses and reports truncation without returning contact data", async () => {
    const records = Array.from({ length: 201 }, (_, index) => ({
      _id: `calendar-${index}`,
      viewingRequest: {
        status: "requested",
        requestedDate: "2026-09-10",
        requestedTime: "09:00",
      },
    }));
    const query = readQuery(records);
    vi.spyOn(InquiryModel, "find").mockReturnValue(query as never);

    const result = await new MongooseAdminOperationsService().viewingCalendar({
      start: "2026-08-30",
      end: "2026-10-10",
    });

    expect(result.items).toHaveLength(200);
    expect(result.truncated).toBe(true);
    expect(query.limit).toHaveBeenCalledWith(201);
    expect(query.select.mock.calls[0]?.[0]).not.toMatch(/name|email|phone|message/);
  });
});

describe("admin audit viewer queries", () => {
  it("paginates a value-minimized projection and does not serialize event details", async () => {
    const query = readQuery([
      {
        _id: "audit-event-id",
        actorStaffIdentity: "507f1f77bcf86cd799439011",
        action: "property.edited",
        entityType: "property",
        entityId: "property-id",
        outcome: "succeeded",
        requestId: "safe-request-id",
        occurredAt: new Date("2026-09-10T01:00:00.000Z"),
        details: { reason: "must not be serialized" },
      },
    ]);
    vi.spyOn(SecurityAuditEventModel, "find").mockReturnValue(query as never);
    vi.spyOn(SecurityAuditEventModel, "countDocuments").mockResolvedValue(26);

    const result = await new MongooseAdminOperationsService().auditEvents({
      action: "property.edited",
      page: 2,
      limit: 25,
    });

    expect(query.select).toHaveBeenCalledWith(
      "actorStaffIdentity action entityType entityId outcome requestId occurredAt",
    );
    expect(query.skip).toHaveBeenCalledWith(25);
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(result.pagination).toEqual({ page: 2, limit: 25, total: 26, totalPages: 2 });
    expect(JSON.stringify(result)).not.toContain("must not be serialized");
  });
});
