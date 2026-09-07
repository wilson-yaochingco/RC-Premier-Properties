import type {
  AdminInquiryListRequest,
  InquiryStatus,
  UpdateViewingRequestRequest,
  ViewingRequestStatus,
} from "@rc/shared";
import { describe, expect, it } from "vitest";
import type { SecurityAuditEventInput } from "../src/modules/auth/auth.types.js";
import { DefaultAdminInquiryService } from "../src/modules/inquiries/inquiry.service.js";
import type {
  AdminInquiryRecord,
  InquiryAdminRepository,
} from "../src/modules/inquiries/inquiry.types.js";

const INQUIRY_ID = "507f191e810c19729de860ea";
const NOTE_ID = "507f191e810c19729de860eb";
const STAFF_ID = "507f191e810c19729de860ec";
const NOW = new Date("2026-09-07T08:00:00.000Z");

function fixture(overrides: Partial<AdminInquiryRecord> = {}): AdminInquiryRecord {
  return {
    _id: INQUIRY_ID,
    name: "Private Person",
    email: "private@example.test",
    phone: "+63 917 555 0199",
    inquiryType: "property",
    source: "property-detail",
    propertyId: "RCPP-ADMIN-001",
    subject: "Private subject",
    message: "Private message that must never enter an audit record.",
    privacyConsent: true,
    privacyConsentAt: NOW,
    status: "new",
    statusHistory: [{ toStatus: "new", changedAt: NOW }],
    internalNotes: [],
    createdAt: NOW,
    updatedAt: NOW,
    __v: 0,
    ...overrides,
  };
}

class MemoryInquiryAdminRepository implements InquiryAdminRepository {
  record: AdminInquiryRecord | null = fixture();
  listRequest?: AdminInquiryListRequest;

  async list(request: AdminInquiryListRequest) {
    this.listRequest = request;
    return { records: this.record ? [this.record] : [], total: this.record ? 1 : 0 };
  }

  async findById(id: string) {
    return id === INQUIRY_ID ? this.record : null;
  }

  async updateStatus(
    id: string,
    expectedVersion: number,
    currentStatus: InquiryStatus,
    status: InquiryStatus,
    _actorStaffIdentityId: string,
    occurredAt: Date,
    statusBeforeSpam?: Exclude<InquiryStatus, "spam"> | null,
  ) {
    if (
      id !== INQUIRY_ID ||
      !this.record ||
      (this.record.__v ?? 0) !== expectedVersion ||
      this.record.status !== currentStatus
    ) {
      return null;
    }
    this.record = {
      ...this.record,
      status,
      ...(statusBeforeSpam ? { statusBeforeSpam } : {}),
      ...(statusBeforeSpam === null ? { statusBeforeSpam: undefined } : {}),
      statusHistory: [
        ...this.record.statusHistory,
        { fromStatus: currentStatus, toStatus: status, changedAt: occurredAt },
      ],
      updatedAt: occurredAt,
      __v: (this.record.__v ?? 0) + 1,
    };
    return this.record;
  }

  async addNote(
    id: string,
    expectedVersion: number,
    note: string,
    _actorStaffIdentityId: string,
    occurredAt: Date,
  ) {
    if (id !== INQUIRY_ID || !this.record || (this.record.__v ?? 0) !== expectedVersion)
      return null;
    this.record = {
      ...this.record,
      internalNotes: [
        ...this.record.internalNotes,
        { _id: NOTE_ID, note, authorStaffIdentity: STAFF_ID, createdAt: occurredAt },
      ],
      updatedAt: occurredAt,
      __v: (this.record.__v ?? 0) + 1,
    };
    return this.record;
  }

  async updateViewingRequest(
    id: string,
    expectedVersion: number,
    currentViewingStatus: ViewingRequestStatus,
    input: Pick<
      UpdateViewingRequestRequest,
      "status" | "requestedDate" | "requestedTime"
    >,
    _actorStaffIdentityId: string,
    occurredAt: Date,
    currentInquiryStatus: InquiryStatus,
    nextInquiryStatus: InquiryStatus,
  ) {
    if (
      id !== INQUIRY_ID ||
      !this.record?.viewingRequest ||
      (this.record.__v ?? 0) !== expectedVersion ||
      this.record.viewingRequest.status !== currentViewingStatus ||
      this.record.status !== currentInquiryStatus
    ) {
      return null;
    }
    this.record = {
      ...this.record,
      status: nextInquiryStatus,
      statusHistory:
        nextInquiryStatus === currentInquiryStatus
          ? this.record.statusHistory
          : [
              ...this.record.statusHistory,
              {
                fromStatus: currentInquiryStatus,
                toStatus: nextInquiryStatus,
                changedAt: occurredAt,
              },
            ],
      viewingRequest: {
        status: input.status,
        requestedDate: input.requestedDate,
        requestedTime: input.requestedTime,
        statusHistory: [
          ...this.record.viewingRequest.statusHistory,
          {
            fromStatus: currentViewingStatus,
            toStatus: input.status,
            requestedDate: input.requestedDate,
            requestedTime: input.requestedTime,
            changedAt: occurredAt,
          },
        ],
      },
      updatedAt: occurredAt,
      __v: (this.record.__v ?? 0) + 1,
    };
    return this.record;
  }

  async archive(
    id: string,
    expectedVersion: number,
    _actorStaffIdentityId: string,
    occurredAt: Date,
  ) {
    if (id !== INQUIRY_ID || !this.record || (this.record.__v ?? 0) !== expectedVersion)
      return null;
    this.record = {
      ...this.record,
      archivedAt: occurredAt,
      updatedAt: occurredAt,
      __v: (this.record.__v ?? 0) + 1,
    };
    return this.record;
  }

  async restore(id: string, expectedVersion: number) {
    if (id !== INQUIRY_ID || !this.record || (this.record.__v ?? 0) !== expectedVersion)
      return null;
    const { archivedAt, ...active } = this.record;
    void archivedAt;
    this.record = {
      ...active,
      updatedAt: NOW,
      __v: (this.record.__v ?? 0) + 1,
    };
    return this.record;
  }
}

function makeService() {
  const repository = new MemoryInquiryAdminRepository();
  const audits: SecurityAuditEventInput[] = [];
  const service = new DefaultAdminInquiryService(repository, {
    async recordAudit(event) {
      audits.push(event);
    },
  });
  return { audits, repository, service };
}

const CONTEXT = {
  actorStaffIdentityId: STAFF_ID,
  requestId: "request-inquiry-test",
  occurredAt: NOW,
};

describe("admin inquiry service", () => {
  it("returns paginated summaries without private message bodies and detailed history", async () => {
    const { repository, service } = makeService();
    const request: AdminInquiryListRequest = {
      query: "Private",
      queue: "active",
      page: 2,
      limit: 10,
    };
    const list = await service.list(request);
    const detail = await service.detail(INQUIRY_ID);

    expect(repository.listRequest).toEqual(request);
    expect(list.pagination).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
    expect(list.items[0]).not.toHaveProperty("message");
    expect(detail).toMatchObject({
      propertyId: "RCPP-ADMIN-001",
      message: "Private message that must never enter an audit record.",
      statusHistory: [{ toStatus: "new" }],
    });
  });

  it("tracks status, spam quarantine, and legitimate restoration with value-free audits", async () => {
    const { audits, service } = makeService();
    const progressed = await service.updateStatus(
      INQUIRY_ID,
      { status: "in-progress", expectedVersion: 0 },
      CONTEXT,
    );
    const spam = await service.markSpam(
      INQUIRY_ID,
      { expectedVersion: progressed?.version ?? -1 },
      CONTEXT,
    );
    const restored = await service.markNotSpam(
      INQUIRY_ID,
      { expectedVersion: spam?.version ?? -1 },
      CONTEXT,
    );

    expect(progressed?.status).toBe("in-progress");
    expect(spam?.status).toBe("spam");
    expect(restored?.status).toBe("in-progress");
    expect(restored?.statusHistory).toHaveLength(4);
    expect(audits.map((event) => event.action)).toEqual([
      "inquiry.status-changed",
      "inquiry.marked-spam",
      "inquiry.restored-from-spam",
    ]);
    const serialized = JSON.stringify(audits);
    expect(serialized).not.toContain("private@example.test");
    expect(serialized).not.toContain("Private message");
  });

  it("appends bounded internal notes and uses recoverable archive/restore actions", async () => {
    const { audits, service } = makeService();
    const noted = await service.addNote(
      INQUIRY_ID,
      { note: "Called and requested a follow-up.", expectedVersion: 0 },
      CONTEXT,
    );
    const archived = await service.archive(
      INQUIRY_ID,
      { expectedVersion: noted?.version ?? -1 },
      CONTEXT,
    );
    const restored = await service.restore(
      INQUIRY_ID,
      { expectedVersion: archived?.version ?? -1 },
      CONTEXT,
    );

    expect(noted?.internalNotes).toEqual([
      {
        id: NOTE_ID,
        note: "Called and requested a follow-up.",
        createdAt: NOW.toISOString(),
      },
    ]);
    expect(archived?.archivedAt).toBe(NOW.toISOString());
    expect(restored).not.toHaveProperty("archivedAt");
    expect(audits.map((event) => event.action)).toEqual([
      "inquiry.note-added",
      "inquiry.archived",
      "inquiry.restored",
    ]);
    expect(JSON.stringify(audits)).not.toContain("Called and requested");
  });

  it("rejects stale writes and returns null for missing records without false audits", async () => {
    const { audits, service } = makeService();
    await expect(
      service.updateStatus(
        INQUIRY_ID,
        { status: "closed", expectedVersion: 9 },
        CONTEXT,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.updateStatus(
        "507f191e810c19729de860ff",
        { status: "closed", expectedVersion: 0 },
        CONTEXT,
      ),
    ).resolves.toBeNull();
    expect(audits).toHaveLength(0);
  });

  it("tracks valid viewing transitions and synchronizes inquiry status narrowly", async () => {
    const { audits, repository, service } = makeService();
    repository.record = fixture({
      inquiryType: "viewing",
      source: "viewing-page",
      viewingRequest: {
        status: "requested",
        requestedDate: "2026-09-20",
        requestedTime: "10:30",
        statusHistory: [
          {
            toStatus: "requested",
            requestedDate: "2026-09-20",
            requestedTime: "10:30",
            changedAt: NOW,
          },
        ],
      },
    });

    const confirmed = await service.updateViewingRequest(
      INQUIRY_ID,
      {
        status: "confirmed",
        requestedDate: "2026-09-20",
        requestedTime: "10:30",
        expectedVersion: 0,
      },
      CONTEXT,
    );
    expect(confirmed).toMatchObject({
      status: "viewing-scheduled",
      viewingRequest: { status: "confirmed" },
    });

    const completed = await service.updateViewingRequest(
      INQUIRY_ID,
      {
        status: "completed",
        requestedDate: "2026-09-20",
        requestedTime: "10:30",
        expectedVersion: confirmed?.version ?? -1,
      },
      CONTEXT,
    );
    expect(completed).toMatchObject({
      status: "in-progress",
      viewingRequest: { status: "completed" },
    });
    expect(audits.map((event) => event.action)).toEqual([
      "viewing.confirmed",
      "viewing.completed",
    ]);
    expect(JSON.stringify(audits)).not.toContain("10:30");

    await expect(
      service.updateViewingRequest(
        INQUIRY_ID,
        {
          status: "canceled",
          requestedDate: "2026-09-20",
          requestedTime: "10:30",
          expectedVersion: completed?.version ?? -1,
        },
        CONTEXT,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("records reschedule and cancellation without overwriting unrelated inquiry state", async () => {
    const { audits, repository, service } = makeService();
    repository.record = fixture({
      inquiryType: "viewing",
      source: "viewing-page",
      status: "closed",
      viewingRequest: {
        status: "requested",
        requestedDate: "2026-09-20",
        requestedTime: "10:30",
        statusHistory: [
          {
            toStatus: "requested",
            requestedDate: "2026-09-20",
            requestedTime: "10:30",
            changedAt: NOW,
          },
        ],
      },
    });

    const reschedule = await service.updateViewingRequest(
      INQUIRY_ID,
      {
        status: "reschedule-requested",
        requestedDate: "2026-09-21",
        requestedTime: "14:00",
        expectedVersion: 0,
      },
      CONTEXT,
    );
    const canceled = await service.updateViewingRequest(
      INQUIRY_ID,
      {
        status: "canceled",
        requestedDate: "2026-09-21",
        requestedTime: "14:00",
        expectedVersion: reschedule?.version ?? -1,
      },
      CONTEXT,
    );

    expect(canceled).toMatchObject({
      status: "closed",
      viewingRequest: {
        status: "canceled",
        requestedDate: "2026-09-21",
        requestedTime: "14:00",
      },
    });
    expect(audits.map((event) => event.action)).toEqual([
      "viewing.reschedule-requested",
      "viewing.canceled",
    ]);
    await expect(
      service.updateViewingRequest(
        INQUIRY_ID,
        {
          status: "confirmed",
          requestedDate: "2026-09-22",
          requestedTime: "10:00",
          expectedVersion: 0,
        },
        CONTEXT,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
