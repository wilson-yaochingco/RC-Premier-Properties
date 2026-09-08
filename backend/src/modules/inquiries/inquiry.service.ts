import { createHash } from "node:crypto";
import type {
  AdminInquiryDetail,
  AdminInquiryListRequest,
  AdminInquiryListResponse,
  AdminInquirySummary,
  AdminInquiryTransitionRequest,
  AddInquiryNoteRequest,
  CreateInquiryRequest,
  CreateInquiryResponse,
  InquiryStatus,
  InquiryType,
  UpdateViewingRequestRequest,
  ViewingRequestStatus,
  UpdateInquiryStatusRequest,
} from "@rc/shared";
import { Types, type Model, type QueryFilter } from "mongoose";
import { HttpError } from "../../middleware/errorHandler.js";
import { mongooseAuthStore } from "../auth/auth.store.js";
import { PropertyModel } from "../properties/property.model.js";
import type { PropertyEntity } from "../properties/property.types.js";
import { InquiryModel } from "./inquiry.model.js";
import {
  buildInquiryNotification,
  inquiryNotifier,
  type InquiryNotifier,
} from "./inquiry.notification.js";
import type {
  AdminInquiryRecord,
  AdminInquiryService,
  InquiryAdminRepository,
  InquiryAuditRecorder,
  InquiryEntity,
  InquiryMutationContext,
  InquiryService,
  ViewingPropertyRepository,
} from "./inquiry.types.js";

const RECEIVED_MESSAGE =
  "Thank you for contacting RC Premier Properties. We have received your inquiry and will get back to you using your preferred contact method.";
const VIEWING_RECEIVED_MESSAGE =
  "Your viewing request has been received. Our team will contact you to confirm the requested schedule; it is not yet an appointment.";

export class MongooseViewingPropertyRepository implements ViewingPropertyRepository {
  constructor(private readonly model: Model<PropertyEntity> = PropertyModel) {}

  async isRequestablePropertyId(propertyId: string): Promise<boolean> {
    return Boolean(
      await this.model.exists({
        propertyId,
        publicationStatus: "published",
        purpose: "sale",
        availability: { $ne: "sold" },
      }),
    );
  }
}

export class MongooseInquiryService implements InquiryService {
  constructor(
    private readonly model: Model<InquiryEntity> = InquiryModel,
    private readonly properties: ViewingPropertyRepository = new MongooseViewingPropertyRepository(),
    private readonly notifier: InquiryNotifier = inquiryNotifier,
  ) {}

  async create(
    request: Omit<CreateInquiryRequest, "website">,
    idempotencyKey?: string,
  ): Promise<CreateInquiryResponse> {
    const now = new Date();
    const idempotencyKeyHash = idempotencyKey
      ? createHash("sha256").update(idempotencyKey).digest("hex")
      : undefined;
    if (idempotencyKeyHash) {
      const existing = await this.findIdempotentInquiry(idempotencyKeyHash);
      if (existing) {
        return createResponse(
          String(existing._id),
          existing.createdAt,
          existing.inquiryType,
        );
      }
    }

    const { requestedDate, requestedTime, ...inquiryInput } = request;
    if (inquiryInput.inquiryType === "viewing") {
      if (
        !inquiryInput.propertyId ||
        !requestedDate ||
        !requestedTime ||
        !(await this.properties.isRequestablePropertyId(inquiryInput.propertyId))
      ) {
        throw new HttpError(400, "Invalid viewing request.", [
          {
            field: "propertyId",
            message: "Select a published sale property that is available for viewing.",
          },
        ]);
      }
    }
    let inquiry;
    try {
      inquiry = await this.model.create({
        ...inquiryInput,
        privacyConsentAt: now,
        status: "new",
        statusHistory: [{ toStatus: "new", changedAt: now }],
        ...(inquiryInput.inquiryType === "viewing"
          ? {
              viewingRequest: {
                status: "requested",
                requestedDate,
                requestedTime,
                statusHistory: [
                  {
                    toStatus: "requested",
                    requestedDate,
                    requestedTime,
                    changedAt: now,
                  },
                ],
              },
            }
          : {}),
        ...(idempotencyKeyHash ? { idempotencyKeyHash } : {}),
      });
    } catch (error) {
      if (!idempotencyKeyHash || !isDuplicateKey(error)) throw error;
      const existing = await this.findIdempotentInquiry(idempotencyKeyHash);
      if (!existing) throw error;
      return createResponse(
        String(existing._id),
        existing.createdAt,
        existing.inquiryType,
      );
    }

    const inquiryId = String(inquiry._id);
    try {
      await this.notifier.send(
        buildInquiryNotification(inquiryId, request, inquiry.createdAt),
      );
    } catch {
      // Persistence is the source of truth. Notification failure must never reject or
      // roll back an inquiry that has already been accepted into MongoDB.
    }
    return createResponse(inquiryId, inquiry.createdAt, inquiry.inquiryType);
  }

  private findIdempotentInquiry(idempotencyKeyHash: string) {
    return this.model
      .findOne({ idempotencyKeyHash })
      .select("_id createdAt inquiryType")
      .lean<{ _id: unknown; createdAt: Date; inquiryType: InquiryType } | null>();
  }
}

function createResponse(
  id: string,
  createdAt: Date,
  inquiryType: InquiryType,
): CreateInquiryResponse {
  return {
    inquiryId: id,
    status: "received",
    message: inquiryType === "viewing" ? VIEWING_RECEIVED_MESSAGE : RECEIVED_MESSAGE,
    createdAt: createdAt.toISOString(),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function versionFilter(expectedVersion: number): QueryFilter<InquiryEntity> {
  return expectedVersion === 0
    ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
    : { __v: expectedVersion };
}

export class MongooseInquiryAdminRepository implements InquiryAdminRepository {
  constructor(private readonly model: Model<InquiryEntity> = InquiryModel) {}

  async list(request: AdminInquiryListRequest) {
    const filters: QueryFilter<InquiryEntity>[] = [];
    if (request.queue === "active") {
      filters.push({ archivedAt: { $exists: false } }, { status: { $ne: "spam" } });
    } else if (request.queue === "spam") {
      filters.push({ archivedAt: { $exists: false } }, { status: "spam" });
    } else if (request.queue === "archived") {
      filters.push({ archivedAt: { $exists: true } });
    }
    if (request.status) filters.push({ status: request.status });
    if (request.inquiryType) filters.push({ inquiryType: request.inquiryType });
    if (request.source) filters.push({ source: request.source });
    if (request.propertyId) filters.push({ propertyId: request.propertyId });
    if (request.viewingStatus) {
      filters.push({ "viewingRequest.status": request.viewingStatus });
    }
    if (request.query) {
      const expression = new RegExp(escapeRegExp(request.query), "i");
      filters.push({
        $or: [
          { name: expression },
          { email: expression },
          { phone: expression },
          { propertyId: expression },
          { subject: expression },
        ],
      });
    }
    const filter: QueryFilter<InquiryEntity> =
      filters.length > 0 ? { $and: filters } : {};
    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .select(
          "name email inquiryType source propertyId subject status viewingRequest.status viewingRequest.requestedDate viewingRequest.requestedTime createdAt updatedAt archivedAt __v",
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((request.page - 1) * request.limit)
        .limit(request.limit)
        .lean<AdminInquiryRecord[]>(),
      this.model.countDocuments(filter),
    ]);
    return { records, total };
  }

  async findById(id: string): Promise<AdminInquiryRecord | null> {
    return this.model
      .findById(id)
      .select("+internalNotes")
      .lean<AdminInquiryRecord | null>();
  }

  async updateStatus(
    id: string,
    expectedVersion: number,
    currentStatus: InquiryStatus,
    status: InquiryStatus,
    actorStaffIdentityId: string,
    occurredAt: Date,
    statusBeforeSpam?: Exclude<InquiryStatus, "spam"> | null,
  ): Promise<AdminInquiryRecord | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: currentStatus,
          archivedAt: { $exists: false },
          ...versionFilter(expectedVersion),
        },
        {
          $set: {
            status,
            ...(statusBeforeSpam ? { statusBeforeSpam } : {}),
          },
          ...(statusBeforeSpam === null ? { $unset: { statusBeforeSpam: 1 } } : {}),
          $push: {
            statusHistory: {
              fromStatus: currentStatus,
              toStatus: status,
              changedByStaffIdentity: new Types.ObjectId(actorStaffIdentityId),
              changedAt: occurredAt,
            },
          },
          $inc: { __v: 1 },
        },
        { new: true },
      )
      .select("+internalNotes")
      .lean<AdminInquiryRecord | null>();
  }

  async updateViewingRequest(
    id: string,
    expectedVersion: number,
    currentViewingStatus: ViewingRequestStatus,
    input: Pick<
      UpdateViewingRequestRequest,
      "status" | "requestedDate" | "requestedTime"
    >,
    actorStaffIdentityId: string,
    occurredAt: Date,
    currentInquiryStatus: InquiryStatus,
    nextInquiryStatus: InquiryStatus,
  ): Promise<AdminInquiryRecord | null> {
    const inquiryStatusChanged = currentInquiryStatus !== nextInquiryStatus;
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          inquiryType: "viewing",
          status: currentInquiryStatus,
          "viewingRequest.status": currentViewingStatus,
          archivedAt: { $exists: false },
          ...versionFilter(expectedVersion),
        },
        {
          $set: {
            "viewingRequest.status": input.status,
            "viewingRequest.requestedDate": input.requestedDate,
            "viewingRequest.requestedTime": input.requestedTime,
            ...(inquiryStatusChanged ? { status: nextInquiryStatus } : {}),
          },
          $push: {
            "viewingRequest.statusHistory": {
              fromStatus: currentViewingStatus,
              toStatus: input.status,
              requestedDate: input.requestedDate,
              requestedTime: input.requestedTime,
              changedByStaffIdentity: new Types.ObjectId(actorStaffIdentityId),
              changedAt: occurredAt,
            },
            ...(inquiryStatusChanged
              ? {
                  statusHistory: {
                    fromStatus: currentInquiryStatus,
                    toStatus: nextInquiryStatus,
                    changedByStaffIdentity: new Types.ObjectId(actorStaffIdentityId),
                    changedAt: occurredAt,
                  },
                }
              : {}),
          },
          $inc: { __v: 1 },
        },
        { new: true },
      )
      .select("+internalNotes")
      .lean<AdminInquiryRecord | null>();
  }

  async addNote(
    id: string,
    expectedVersion: number,
    note: string,
    actorStaffIdentityId: string,
    occurredAt: Date,
  ): Promise<AdminInquiryRecord | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          archivedAt: { $exists: false },
          "internalNotes.99": { $exists: false },
          ...versionFilter(expectedVersion),
        },
        {
          $push: {
            internalNotes: {
              _id: new Types.ObjectId(),
              note,
              authorStaffIdentity: new Types.ObjectId(actorStaffIdentityId),
              createdAt: occurredAt,
            },
          },
          $inc: { __v: 1 },
        },
        { new: true },
      )
      .select("+internalNotes")
      .lean<AdminInquiryRecord | null>();
  }

  async archive(
    id: string,
    expectedVersion: number,
    actorStaffIdentityId: string,
    occurredAt: Date,
  ): Promise<AdminInquiryRecord | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          archivedAt: { $exists: false },
          ...versionFilter(expectedVersion),
        },
        {
          $set: {
            archivedAt: occurredAt,
            archivedByStaffIdentity: new Types.ObjectId(actorStaffIdentityId),
          },
          $inc: { __v: 1 },
        },
        { new: true },
      )
      .select("+internalNotes")
      .lean<AdminInquiryRecord | null>();
  }

  async restore(
    id: string,
    expectedVersion: number,
  ): Promise<AdminInquiryRecord | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, archivedAt: { $exists: true }, ...versionFilter(expectedVersion) },
        {
          $unset: { archivedAt: 1, archivedByStaffIdentity: 1 },
          $inc: { __v: 1 },
        },
        { new: true },
      )
      .select("+internalNotes")
      .lean<AdminInquiryRecord | null>();
  }
}

function toSummary(record: AdminInquiryRecord): AdminInquirySummary {
  return {
    id: String(record._id),
    name: record.name,
    email: record.email,
    inquiryType: record.inquiryType,
    source: record.source,
    ...(record.propertyId ? { propertyId: record.propertyId } : {}),
    ...(record.subject ? { subject: record.subject } : {}),
    status: record.status,
    ...(record.viewingRequest
      ? {
          viewingRequest: {
            status: record.viewingRequest.status,
            requestedDate: record.viewingRequest.requestedDate,
            requestedTime: record.viewingRequest.requestedTime,
          },
        }
      : {}),
    version: record.__v ?? 0,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.archivedAt ? { archivedAt: record.archivedAt.toISOString() } : {}),
  };
}

function toDetail(record: AdminInquiryRecord): AdminInquiryDetail {
  const summary = toSummary(record);
  const history =
    record.statusHistory?.length > 0
      ? record.statusHistory
      : [{ toStatus: record.status, changedAt: record.createdAt }];
  return {
    ...summary,
    ...(record.phone ? { phone: record.phone } : {}),
    ...(record.message ? { message: record.message } : {}),
    privacyConsentAt: record.privacyConsentAt.toISOString(),
    internalNotes: (record.internalNotes ?? []).map((entry) => ({
      id: String(entry._id),
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
    statusHistory: history.map((entry) => ({
      ...(entry.fromStatus ? { fromStatus: entry.fromStatus } : {}),
      toStatus: entry.toStatus,
      changedAt: entry.changedAt.toISOString(),
    })),
    viewingRequest: record.viewingRequest
      ? {
          status: record.viewingRequest.status,
          requestedDate: record.viewingRequest.requestedDate,
          requestedTime: record.viewingRequest.requestedTime,
          statusHistory: record.viewingRequest.statusHistory.map((entry) => ({
            ...(entry.fromStatus ? { fromStatus: entry.fromStatus } : {}),
            toStatus: entry.toStatus,
            requestedDate: entry.requestedDate,
            requestedTime: entry.requestedTime,
            changedAt: entry.changedAt.toISOString(),
          })),
        }
      : undefined,
  };
}

export class DefaultAdminInquiryService implements AdminInquiryService {
  constructor(
    private readonly repository: InquiryAdminRepository,
    private readonly audit: InquiryAuditRecorder,
  ) {}

  async list(request: AdminInquiryListRequest): Promise<AdminInquiryListResponse> {
    const { records, total } = await this.repository.list(request);
    return {
      items: records.map(toSummary),
      pagination: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / request.limit),
      },
    };
  }

  async detail(id: string): Promise<AdminInquiryDetail | null> {
    const record = await this.repository.findById(id);
    return record ? toDetail(record) : null;
  }

  async updateStatus(
    id: string,
    input: UpdateInquiryStatusRequest,
    context: InquiryMutationContext,
  ) {
    return this.changeStatus(
      id,
      input.expectedVersion,
      input.status,
      "inquiry.status-changed",
      context,
    );
  }

  async updateViewingRequest(
    id: string,
    input: UpdateViewingRequestRequest,
    context: InquiryMutationContext,
  ) {
    const current = await this.expectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.archivedAt)
      throw new HttpError(409, "Restore this inquiry before updating it.");
    if (current.status === "spam") {
      throw new HttpError(409, "Restore this inquiry from spam before updating it.");
    }
    if (current.inquiryType !== "viewing" || !current.viewingRequest) {
      throw new HttpError(409, "This inquiry is not a structured viewing request.");
    }
    const allowed = VIEWING_TRANSITIONS[current.viewingRequest.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new HttpError(
        409,
        `A ${current.viewingRequest.status} viewing cannot change to ${input.status}.`,
      );
    }
    const nextInquiryStatus = synchronizedInquiryStatus(current.status, input.status);
    const occurredAt = context.occurredAt ?? new Date();
    const record = await this.repository.updateViewingRequest(
      id,
      input.expectedVersion,
      current.viewingRequest.status,
      input,
      context.actorStaffIdentityId,
      occurredAt,
      current.status,
      nextInquiryStatus,
    );
    if (!record) throw this.concurrencyConflict();
    await this.recordAudit(
      record,
      `viewing.${input.status}` as import("../auth/auth.types.js").AuditAction,
      context,
      occurredAt,
    );
    return toDetail(record);
  }

  async markSpam(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ) {
    return this.changeStatus(
      id,
      input.expectedVersion,
      "spam",
      "inquiry.marked-spam",
      context,
    );
  }

  async markNotSpam(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ) {
    const current = await this.expectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.archivedAt)
      throw new HttpError(409, "Restore this inquiry before updating it.");
    if (current.status !== "spam")
      throw new HttpError(409, "This inquiry is not quarantined as spam.");
    return this.persistStatus(
      current,
      current.statusBeforeSpam ?? "new",
      "inquiry.restored-from-spam",
      context,
      null,
    );
  }

  async addNote(
    id: string,
    input: AddInquiryNoteRequest,
    context: InquiryMutationContext,
  ) {
    const current = await this.expectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.archivedAt)
      throw new HttpError(409, "Restore this inquiry before adding a note.");
    if ((current.internalNotes?.length ?? 0) >= 100) {
      throw new HttpError(409, "This inquiry has reached the internal note limit.");
    }
    const occurredAt = context.occurredAt ?? new Date();
    const record = await this.repository.addNote(
      id,
      input.expectedVersion,
      input.note,
      context.actorStaffIdentityId,
      occurredAt,
    );
    if (!record) throw this.concurrencyConflict();
    await this.recordAudit(record, "inquiry.note-added", context, occurredAt);
    return toDetail(record);
  }

  async archive(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ) {
    const current = await this.expectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (current.archivedAt)
      throw new HttpError(409, "This inquiry is already archived.");
    const occurredAt = context.occurredAt ?? new Date();
    const record = await this.repository.archive(
      id,
      input.expectedVersion,
      context.actorStaffIdentityId,
      occurredAt,
    );
    if (!record) throw this.concurrencyConflict();
    await this.recordAudit(record, "inquiry.archived", context, occurredAt);
    return toDetail(record);
  }

  async restore(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ) {
    const current = await this.expectedRecord(id, input.expectedVersion);
    if (!current) return null;
    if (!current.archivedAt) throw new HttpError(409, "This inquiry is not archived.");
    const occurredAt = context.occurredAt ?? new Date();
    const record = await this.repository.restore(id, input.expectedVersion);
    if (!record) throw this.concurrencyConflict();
    await this.recordAudit(record, "inquiry.restored", context, occurredAt);
    return toDetail(record);
  }

  private async changeStatus(
    id: string,
    expectedVersion: number,
    status: InquiryStatus,
    action: import("../auth/auth.types.js").AuditAction,
    context: InquiryMutationContext,
  ) {
    const current = await this.expectedRecord(id, expectedVersion);
    if (!current) return null;
    if (current.archivedAt)
      throw new HttpError(409, "Restore this inquiry before updating it.");
    if (current.status === "spam") {
      throw new HttpError(
        409,
        "Restore this inquiry from spam before changing its workflow status.",
      );
    }
    if (current.status === status)
      throw new HttpError(409, "This inquiry already has that status.");
    return this.persistStatus(
      current,
      status,
      action,
      context,
      status === "spam" ? current.status : undefined,
    );
  }

  private async persistStatus(
    current: AdminInquiryRecord,
    status: InquiryStatus,
    action: import("../auth/auth.types.js").AuditAction,
    context: InquiryMutationContext,
    statusBeforeSpam?: Exclude<InquiryStatus, "spam"> | null,
  ) {
    const occurredAt = context.occurredAt ?? new Date();
    const record = await this.repository.updateStatus(
      String(current._id),
      current.__v ?? 0,
      current.status,
      status,
      context.actorStaffIdentityId,
      occurredAt,
      statusBeforeSpam,
    );
    if (!record) throw this.concurrencyConflict();
    await this.recordAudit(record, action, context, occurredAt);
    return toDetail(record);
  }

  private async expectedRecord(id: string, expectedVersion: number) {
    const current = await this.repository.findById(id);
    if (!current) return null;
    if ((current.__v ?? 0) !== expectedVersion) throw this.concurrencyConflict();
    return current;
  }

  private concurrencyConflict() {
    return new HttpError(
      409,
      "This inquiry changed after you loaded it. Refresh and review the latest version.",
    );
  }

  private async recordAudit(
    record: AdminInquiryRecord,
    action: import("../auth/auth.types.js").AuditAction,
    context: InquiryMutationContext,
    occurredAt: Date,
  ) {
    await this.audit.recordAudit({
      actorStaffIdentityId: context.actorStaffIdentityId,
      action,
      entityType: "inquiry",
      entityId: String(record._id),
      outcome: "succeeded",
      requestId: context.requestId,
      occurredAt,
    });
  }
}

export const mongooseInquiryService = new MongooseInquiryService();
export const mongooseAdminInquiryService = new DefaultAdminInquiryService(
  new MongooseInquiryAdminRepository(),
  mongooseAuthStore,
);

const VIEWING_TRANSITIONS: Record<
  ViewingRequestStatus,
  readonly ViewingRequestStatus[]
> = {
  requested: ["confirmed", "reschedule-requested", "canceled"],
  "reschedule-requested": ["confirmed", "canceled"],
  confirmed: ["reschedule-requested", "completed", "canceled"],
  completed: [],
  canceled: [],
};

function synchronizedInquiryStatus(
  inquiryStatus: InquiryStatus,
  viewingStatus: ViewingRequestStatus,
): InquiryStatus {
  if (
    viewingStatus === "confirmed" &&
    (inquiryStatus === "new" || inquiryStatus === "in-progress")
  ) {
    return "viewing-scheduled";
  }
  if (
    inquiryStatus === "viewing-scheduled" &&
    (viewingStatus === "reschedule-requested" ||
      viewingStatus === "completed" ||
      viewingStatus === "canceled")
  ) {
    return "in-progress";
  }
  return inquiryStatus;
}

export function honeypotResponse(
  inquiryId: string,
  inquiryType: InquiryType,
): CreateInquiryResponse {
  return {
    inquiryId,
    status: "received",
    message: inquiryType === "viewing" ? VIEWING_RECEIVED_MESSAGE : RECEIVED_MESSAGE,
    createdAt: new Date().toISOString(),
  };
}
