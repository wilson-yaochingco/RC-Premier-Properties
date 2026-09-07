import type { AdminInquiryListRequest, InquiryStatus } from "@rc/shared";
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
});
