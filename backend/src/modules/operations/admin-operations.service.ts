import {
  SALE_PROPERTY_TYPES,
  type AdminAuditEventSummary,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminDashboardResponse,
  type AdminStaffListRequest,
  type AdminStaffListResponse,
  type AdminViewingCalendarItem,
  type AdminViewingCalendarResponse,
} from "@rc/shared";
import { Types, type QueryFilter } from "mongoose";
import { InquiryModel } from "../inquiries/inquiry.model.js";
import type { InquiryEntity } from "../inquiries/inquiry.types.js";
import { PropertyModel } from "../properties/property.model.js";
import { PropertyMediaCleanupTaskModel } from "../properties/property-media-cleanup.model.js";
import {
  SecurityAuditEventModel,
  type SecurityAuditEventEntity,
} from "../auth/security-audit-event.model.js";
import {
  StaffIdentityModel,
  type StaffIdentityEntity,
} from "../auth/staff-identity.model.js";
import type {
  AdminOperationsService,
  AdminViewingCalendarRequest,
} from "./admin-operations.types.js";

const ACTIVE_INQUIRY_STATUSES = ["new", "in-progress", "viewing-scheduled"] as const;
const ACTIVE_VIEWING_STATUSES = [
  "requested",
  "confirmed",
  "reschedule-requested",
] as const;

interface PropertyCounts {
  _id: null;
  published: number;
  draft: number;
  unpublished: number;
  available: number;
  reserved: number;
  sold: number;
}

interface InquiryCounts {
  _id: null;
  active: number;
  new: number;
  retryPending: number;
  terminalFailure: number;
}

interface CalendarRecord {
  _id: unknown;
  propertyId?: string;
  viewingRequest: {
    status: AdminViewingCalendarItem["status"];
    requestedDate: string;
    requestedTime: string;
  };
}

type AuditRecord = SecurityAuditEventEntity & { _id: unknown };
type StaffRecord = StaffIdentityEntity & { _id: unknown };

function manilaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function calendarFilter(start: string, end?: string): QueryFilter<InquiryEntity> {
  return {
    archivedAt: { $exists: false },
    inquiryType: "viewing",
    status: { $in: ACTIVE_INQUIRY_STATUSES },
    "viewingRequest.status": { $in: ACTIVE_VIEWING_STATUSES },
    "viewingRequest.requestedDate": end ? { $gte: start, $lte: end } : { $gte: start },
  };
}

function manilaTime(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: "hour" | "minute") =>
    parts.find((candidate) => candidate.type === type)?.value ?? "00";
  return `${part("hour")}:${part("minute")}`;
}

function upcomingFilter(now = new Date()): QueryFilter<InquiryEntity> {
  const today = manilaDate(now);
  const time = manilaTime(now);
  return {
    ...calendarFilter(today),
    $or: [
      { "viewingRequest.requestedDate": { $gt: today } },
      {
        "viewingRequest.requestedDate": today,
        "viewingRequest.requestedTime": { $gte: time },
      },
    ],
  };
}

function toCalendarItem(record: CalendarRecord): AdminViewingCalendarItem {
  return {
    inquiryId: String(record._id),
    ...(record.propertyId ? { propertyId: record.propertyId } : {}),
    status: record.viewingRequest.status,
    requestedDate: record.viewingRequest.requestedDate,
    requestedTime: record.viewingRequest.requestedTime,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function manilaDayStart(value: string): Date {
  return new Date(`${value}T00:00:00.000+08:00`);
}

function manilaDayAfter(value: string): Date {
  const date = manilaDayStart(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export class MongooseAdminOperationsService implements AdminOperationsService {
  async dashboard(): Promise<AdminDashboardResponse> {
    const upcoming = upcomingFilter();
    const [
      propertyRows,
      inquiryRows,
      upcomingRecords,
      upcomingViewingCount,
      mediaCleanupDebtCount,
    ] = await Promise.all([
      PropertyModel.aggregate<PropertyCounts>([
        {
          $match: {
            purpose: "sale",
            propertyType: { $in: SALE_PROPERTY_TYPES },
          },
        },
        {
          $group: {
            _id: null,
            published: {
              $sum: { $cond: [{ $eq: ["$publicationStatus", "published"] }, 1, 0] },
            },
            draft: {
              $sum: { $cond: [{ $eq: ["$publicationStatus", "draft"] }, 1, 0] },
            },
            unpublished: {
              $sum: { $cond: [{ $eq: ["$publicationStatus", "unpublished"] }, 1, 0] },
            },
            available: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$publicationStatus", "published"] },
                      { $eq: ["$availability", "available"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            reserved: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$publicationStatus", "published"] },
                      { $eq: ["$availability", "reserved"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            sold: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$publicationStatus", "published"] },
                      { $eq: ["$availability", "sold"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      InquiryModel.aggregate<InquiryCounts>([
        {
          $group: {
            _id: null,
            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $ifNull: ["$archivedAt", null] }, null] },
                      { $in: ["$status", ACTIVE_INQUIRY_STATUSES] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            new: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $ifNull: ["$archivedAt", null] }, null] },
                      { $eq: ["$status", "new"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            retryPending: {
              $sum: {
                $cond: [{ $eq: ["$notification.status", "retry-pending"] }, 1, 0],
              },
            },
            terminalFailure: {
              $sum: {
                $cond: [{ $eq: ["$notification.status", "terminal-failure"] }, 1, 0],
              },
            },
          },
        },
      ]),
      InquiryModel.find(upcoming)
        .select(
          "propertyId viewingRequest.status viewingRequest.requestedDate viewingRequest.requestedTime",
        )
        .sort({
          "viewingRequest.requestedDate": 1,
          "viewingRequest.requestedTime": 1,
          _id: 1,
        })
        .limit(6)
        .lean<CalendarRecord[]>(),
      InquiryModel.countDocuments(upcoming),
      PropertyMediaCleanupTaskModel.countDocuments({ status: "pending-review" }),
    ]);
    const properties = propertyRows[0];
    const inquiries = inquiryRows[0];
    return {
      properties: {
        published: properties?.published ?? 0,
        draft: properties?.draft ?? 0,
        unpublished: properties?.unpublished ?? 0,
        available: properties?.available ?? 0,
        reserved: properties?.reserved ?? 0,
        sold: properties?.sold ?? 0,
      },
      inquiries: { active: inquiries?.active ?? 0, new: inquiries?.new ?? 0 },
      notifications: {
        retryPending: inquiries?.retryPending ?? 0,
        terminalFailure: inquiries?.terminalFailure ?? 0,
      },
      upcomingViewings: upcomingRecords.map(toCalendarItem),
      upcomingViewingCount,
      mediaCleanupDebtCount,
      generatedAt: new Date().toISOString(),
    };
  }

  async viewingCalendar(
    request: AdminViewingCalendarRequest,
  ): Promise<AdminViewingCalendarResponse> {
    const filter = calendarFilter(request.start, request.end);
    const [records, total] = await Promise.all([
      InquiryModel.find(filter)
        .select(
          "propertyId viewingRequest.status viewingRequest.requestedDate viewingRequest.requestedTime",
        )
        .sort({
          "viewingRequest.requestedDate": 1,
          "viewingRequest.requestedTime": 1,
          _id: 1,
        })
        .skip((request.page - 1) * request.limit)
        .limit(request.limit)
        .lean<CalendarRecord[]>(),
      InquiryModel.countDocuments(filter),
    ]);
    return {
      items: records.map(toCalendarItem),
      start: request.start,
      end: request.end,
      pagination: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / request.limit),
      },
      truncated: total > request.limit,
    };
  }

  async auditEvents(request: AdminAuditListRequest): Promise<AdminAuditListResponse> {
    const filter: QueryFilter<SecurityAuditEventEntity> = {
      ...(request.action ? { action: request.action } : {}),
      ...(request.entityType ? { entityType: request.entityType } : {}),
      ...(request.outcome ? { outcome: request.outcome } : {}),
      ...(request.actorStaffIdentityId
        ? { actorStaffIdentity: new Types.ObjectId(request.actorStaffIdentityId) }
        : {}),
      ...(request.from || request.to
        ? {
            occurredAt: {
              ...(request.from ? { $gte: manilaDayStart(request.from) } : {}),
              ...(request.to ? { $lt: manilaDayAfter(request.to) } : {}),
            },
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      SecurityAuditEventModel.find(filter)
        .select(
          "actorStaffIdentity action entityType entityId outcome requestId occurredAt",
        )
        .sort({ occurredAt: -1, _id: -1 })
        .skip((request.page - 1) * request.limit)
        .limit(request.limit)
        .lean<AuditRecord[]>(),
      SecurityAuditEventModel.countDocuments(filter),
    ]);
    const items: AdminAuditEventSummary[] = records.map((record) => ({
      id: String(record._id),
      ...(record.actorStaffIdentity
        ? { actorStaffIdentityId: String(record.actorStaffIdentity) }
        : {}),
      action: record.action,
      entityType: record.entityType,
      ...(record.entityType !== "session" && record.entityId
        ? { entityId: record.entityId }
        : {}),
      outcome: record.outcome,
      requestId: record.requestId,
      occurredAt: record.occurredAt.toISOString(),
    }));
    return {
      items,
      pagination: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / request.limit),
      },
    };
  }

  async staff(request: AdminStaffListRequest): Promise<AdminStaffListResponse> {
    const filter: QueryFilter<StaffIdentityEntity> = {
      ...(request.status ? { status: request.status } : {}),
      ...(request.query
        ? {
            $or: [
              { displayName: new RegExp(escapeRegex(request.query), "i") },
              { email: new RegExp(escapeRegex(request.query), "i") },
            ],
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      StaffIdentityModel.find(filter)
        .select(
          "displayName email role status authorizationVersion lastLoginAt createdAt updatedAt",
        )
        .sort({ displayName: 1, _id: 1 })
        .skip((request.page - 1) * request.limit)
        .limit(request.limit)
        .lean<StaffRecord[]>(),
      StaffIdentityModel.countDocuments(filter),
    ]);
    return {
      items: records.map((record) => ({
        id: String(record._id),
        displayName: record.displayName,
        email: record.email,
        role: record.role,
        status: record.status,
        authorizationVersion: record.authorizationVersion,
        ...(record.lastLoginAt
          ? { lastLoginAt: record.lastLoginAt.toISOString() }
          : {}),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })),
      pagination: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / request.limit),
      },
    };
  }
}

export const mongooseAdminOperationsService = new MongooseAdminOperationsService();
