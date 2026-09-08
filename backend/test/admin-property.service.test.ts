import type {
  AdminPropertyMediaInput,
  CreateDraftPropertyRequest,
  UpdateDraftPropertyRequest,
} from "@rc/shared";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { SecurityAuditEventInput } from "../src/modules/auth/auth.types.js";
import { DefaultAdminPropertyService } from "../src/modules/properties/property.service.js";
import type { PropertyMediaStorage } from "../src/modules/properties/property-media.storage.js";
import type {
  AdminPropertyRecord,
  DraftPropertyPersistenceInput,
  PropertyAdminRepository,
  PropertyContentPersistenceInput,
} from "../src/modules/properties/property.types.js";

const PROPERTY_ID = "507f1f77bcf86cd799439011";
const NOW = new Date("2026-09-06T08:00:00.000Z");
const CREATE_REQUEST: CreateDraftPropertyRequest = {
  propertyId: "RCPP-SERVICE-001",
  slug: "service-draft-fixture",
  title: "Service draft fixture",
  purpose: "sale",
  propertyType: "house-and-lot",
  featured: false,
  price: { amount: 8_250_000, negotiable: true },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
  },
  specifications: { bedrooms: 3, bathrooms: 2 },
  shortDescription: "Sensitive draft summary value.",
  description: "Sensitive draft description value.",
  highlights: ["Sensitive highlight value"],
  amenities: [],
  features: [],
};

function recordFrom(
  input: DraftPropertyPersistenceInput,
  overrides: Partial<AdminPropertyRecord> = {},
): AdminPropertyRecord {
  return {
    _id: PROPERTY_ID,
    ...input,
    __v: 0,
    gallery: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

class MemoryAdminPropertyRepository implements PropertyAdminRepository {
  created?: DraftPropertyPersistenceInput;
  updated?: Partial<PropertyContentPersistenceInput>;
  record = recordFrom({
    ...CREATE_REQUEST,
    price: { ...CREATE_REQUEST.price, currency: "PHP" },
    availability: "available",
    publicationStatus: "draft",
  });
  updateResult: AdminPropertyRecord | null = this.record;
  total = 1;
  listRequest?: import("@rc/shared").AdminPropertyListRequest;
  duplicateOnCreate = false;

  async list(request: import("@rc/shared").AdminPropertyListRequest) {
    this.listRequest = request;
    return { records: [this.record], total: this.total };
  }

  async findById(id: string) {
    return id === PROPERTY_ID ? this.record : null;
  }

  async createDraft(input: DraftPropertyPersistenceInput) {
    if (this.duplicateOnCreate)
      throw Object.assign(new Error("duplicate"), { code: 11000 });
    this.created = input;
    this.record = recordFrom(input);
    return this.record;
  }

  async updateDraft(
    _id: string,
    _expectedVersion: number,
    input: Partial<PropertyContentPersistenceInput>,
  ) {
    this.updated = input;
    if (!this.updateResult) return null;
    this.record = {
      ...this.updateResult,
      ...this.updated,
      __v: (this.updateResult.__v ?? 0) + 1,
    };
    return this.record;
  }

  async updateMedia(
    _id: string,
    expectedVersion: number,
    media: AdminPropertyMediaInput[],
    coverMedia?: AdminPropertyMediaInput,
  ) {
    if ((this.record.__v ?? 0) !== expectedVersion) return null;
    this.record = {
      ...this.record,
      gallery: structuredClone(media),
      coverMedia: coverMedia ? structuredClone(coverMedia) : undefined,
      __v: (this.record.__v ?? 0) + 1,
      updatedAt: NOW,
    };
    return this.record;
  }

  async transition(
    _id: string,
    expectedVersion: number,
    currentPublicationStatus: AdminPropertyRecord["publicationStatus"],
    update: {
      publicationStatus?: AdminPropertyRecord["publicationStatus"];
      availability?: AdminPropertyRecord["availability"];
      publishedAt?: Date;
      archiveRestoreStatus?: "draft" | "unpublished";
      clearArchiveRestoreStatus?: boolean;
    },
  ) {
    if (
      (this.record.__v ?? 0) !== expectedVersion ||
      this.record.publicationStatus !== currentPublicationStatus
    ) {
      return null;
    }
    const { clearArchiveRestoreStatus, ...changes } = update;
    this.record = {
      ...this.record,
      ...changes,
      ...(clearArchiveRestoreStatus ? { archiveRestoreStatus: undefined } : {}),
      __v: (this.record.__v ?? 0) + 1,
      updatedAt: NOW,
    };
    return this.record;
  }
}

function makeService(mediaStorage?: PropertyMediaStorage) {
  const repository = new MemoryAdminPropertyRepository();
  const audits: SecurityAuditEventInput[] = [];
  const audit = {
    async recordAudit(event: SecurityAuditEventInput) {
      audits.push(event);
    },
  };
  const service = mediaStorage
    ? new DefaultAdminPropertyService(repository, audit, mediaStorage)
    : new DefaultAdminPropertyService(repository, audit);
  return { audits, repository, service };
}

describe("admin property service", () => {
  it("stores a validated device upload under a server-controlled name and persists its metadata", async () => {
    const stored = {
      id: "media-server-generated",
      url: "/media/properties/server-generated.webp",
    };
    const mediaStorage: PropertyMediaStorage = {
      store: async () => stored,
      remove: async () => undefined,
    };
    const { service, repository, audits } = makeService(mediaStorage);
    const bytes = await sharp({
      create: { width: 640, height: 800, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();

    const result = await service.uploadImage?.(
      PROPERTY_ID,
      { expectedVersion: 0, alt: "Portrait exterior", caption: "Front view" },
      bytes,
      "image/png",
      {
        actorStaffIdentityId: "staff-safe-id",
        requestId: "upload-request",
        occurredAt: NOW,
      },
    );

    expect(result).toMatchObject({
      version: 1,
      coverMedia: stored,
      gallery: [
        {
          ...stored,
          alt: "Portrait exterior",
          caption: "Front view",
          focalPoint: { x: 50, y: 50 },
        },
      ],
    });
    expect(repository.record.gallery[0]?.url).toBe(stored.url);
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain(stored.url);
  });

  it("rejects another upload when the existing media maximum is reached", async () => {
    let storeCalled = false;
    const mediaStorage: PropertyMediaStorage = {
      store: async () => {
        storeCalled = true;
        return { id: "media-unexpected", url: "/media/properties/unexpected.webp" };
      },
      remove: async () => undefined,
    };
    const { service, repository } = makeService(mediaStorage);
    repository.record.gallery = Array.from({ length: 24 }, (_, index) => ({
      id: `media-existing-${index}`,
      kind: "image" as const,
      url: `/media/properties/existing-${index}.webp`,
      alt: `Existing property image ${index + 1}`,
      source: "production" as const,
    }));

    await expect(
      service.uploadImage?.(
        PROPERTY_ID,
        { expectedVersion: 0, alt: "One image too many" },
        Buffer.alloc(0),
        "image/png",
        {
          actorStaffIdentityId: "staff-safe-id",
          requestId: "upload-limit-request",
          occurredAt: NOW,
        },
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(storeCalled).toBe(false);
  });

  it("creates only an available draft and emits one value-free audit event", async () => {
    const { audits, repository, service } = makeService();

    const result = await service.createDraft(CREATE_REQUEST, {
      actorStaffIdentityId: "staff-safe-id",
      requestId: "request-create",
      occurredAt: NOW,
    });

    expect(repository.created).toMatchObject({
      availability: "available",
      publicationStatus: "draft",
      price: { amount: 8_250_000, currency: "PHP", negotiable: true },
    });
    expect(result.publicationStatus).toBe("draft");
    expect(audits).toEqual([
      expect.objectContaining({
        actorStaffIdentityId: "staff-safe-id",
        action: "property.created",
        entityType: "property",
        entityId: PROPERTY_ID,
        outcome: "succeeded",
      }),
    ]);
    const serialized = JSON.stringify(audits);
    expect(serialized).not.toContain(CREATE_REQUEST.description);
    expect(serialized).not.toContain(CREATE_REQUEST.shortDescription);
    expect(serialized).not.toContain(CREATE_REQUEST.highlights[0]);
  });

  it("returns pagination metadata and passes all admin filters to the repository", async () => {
    const { repository, service } = makeService();
    repository.total = 61;
    const request = {
      query: "RCPP-001",
      publicationStatus: "published" as const,
      availability: "reserved" as const,
      page: 2,
      limit: 20,
    };
    const result = await service.listPrivate(request);
    expect(repository.listRequest).toEqual(request);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 61,
      totalPages: 4,
    });
  });

  it("maps duplicate Premier Property numbers or slugs to a conflict", async () => {
    const { repository, service } = makeService();
    repository.duplicateOnCreate = true;
    await expect(
      service.createDraft(CREATE_REQUEST, {
        actorStaffIdentityId: "staff-safe-id",
        requestId: "request-duplicate",
        occurredAt: NOW,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("edits only supplied content and audits changed field names exactly once", async () => {
    const { audits, repository, service } = makeService();
    const request: UpdateDraftPropertyRequest = {
      expectedVersion: 0,
      title: "Sensitive updated title",
      description: "Sensitive updated description",
      price: { amount: 9_000_000, negotiable: false },
    };

    await service.updateDraft(PROPERTY_ID, request, {
      actorStaffIdentityId: "staff-safe-id",
      requestId: "request-edit",
      occurredAt: NOW,
    });

    expect(repository.updated).toEqual({
      title: request.title,
      description: request.description,
      price: { amount: 9_000_000, currency: "PHP", negotiable: false },
    });
    expect(repository.updated).not.toHaveProperty("publicationStatus");
    expect(repository.updated).not.toHaveProperty("availability");
    expect(audits).toEqual([
      expect.objectContaining({
        action: "property.edited",
        entityId: PROPERTY_ID,
        changedFields: ["title", "price", "description"],
      }),
    ]);
    const serialized = JSON.stringify(audits);
    expect(serialized).not.toContain(request.title);
    expect(serialized).not.toContain(request.description);
  });

  it("updates private/public location state without putting sensitive values in audit metadata", async () => {
    const { audits, repository, service } = makeService();
    const location = {
      province: "Pampanga",
      city: "Angeles City",
      barangay: "Synthetic Barangay",
      publicPrecision: "approximate" as const,
      privateAddress: "99 Synthetic Test Street",
      coordinates: { latitude: 15.101, longitude: 120.601 },
      publicPoint: {
        type: "Point" as const,
        coordinates: [120.61, 15.15] as [number, number],
      },
    };

    const result = await service.updateDraft(
      PROPERTY_ID,
      { expectedVersion: 0, location },
      {
        actorStaffIdentityId: "staff-safe-id",
        requestId: "request-location-edit",
        occurredAt: NOW,
      },
    );

    expect(repository.updated).toEqual({ location });
    expect(result?.location).toEqual(location);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "property.edited",
        changedFields: ["location"],
      }),
    ]);
    const serializedAudit = JSON.stringify(audits);
    expect(serializedAudit).not.toContain(location.privateAddress);
    expect(serializedAudit).not.toContain(String(location.coordinates.latitude));
    expect(serializedAudit).not.toContain(String(location.coordinates.longitude));
  });

  it("rejects a stale location edit before persistence or audit", async () => {
    const { audits, repository, service } = makeService();
    repository.record.__v = 2;

    await expect(
      service.updateDraft(
        PROPERTY_ID,
        {
          expectedVersion: 1,
          location: {
            province: "Pampanga",
            city: "Angeles City",
            publicPrecision: "city-only",
          },
        },
        {
          actorStaffIdentityId: "staff-safe-id",
          requestId: "request-stale-location",
          occurredAt: NOW,
        },
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.updated).toBeUndefined();
    expect(audits).toHaveLength(0);
  });

  it("does not audit an edit when no draft transitions", async () => {
    const { audits, repository, service } = makeService();
    repository.updateResult = null;

    await expect(
      service.updateDraft(
        PROPERTY_ID,
        { title: "Unavailable update", expectedVersion: 0 },
        {
          actorStaffIdentityId: "staff-safe-id",
          requestId: "request-missing",
          occurredAt: NOW,
        },
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(audits).toHaveLength(0);
  });

  it("atomically orders images, selects the cover, removes media, and audits no URLs", async () => {
    const { audits, repository, service } = makeService();
    const media: AdminPropertyMediaInput[] = [
      {
        id: "media-second-0002",
        kind: "image",
        url: "/media/properties/second.webp",
        alt: "Second gallery image",
        source: "production",
      },
      {
        id: "media-first-0001",
        kind: "image",
        url: "/media/properties/first.jpg",
        alt: "First gallery image",
        source: "production",
      },
    ];
    const context = {
      actorStaffIdentityId: "staff-safe-id",
      requestId: "request-media",
      occurredAt: NOW,
    };

    const saved = await service.updateMedia(
      PROPERTY_ID,
      { expectedVersion: 0, media, coverMediaId: "media-first-0001" },
      context,
    );
    expect(saved).toMatchObject({
      version: 1,
      coverMedia: { id: "media-first-0001" },
      gallery: [{ id: "media-second-0002" }, { id: "media-first-0001" }],
    });

    const removed = await service.updateMedia(
      PROPERTY_ID,
      { expectedVersion: 1, media: [] },
      context,
    );
    expect(removed?.gallery).toEqual([]);
    expect(removed?.coverMedia).toBeUndefined();
    expect(audits.map((event) => event.action)).toEqual([
      "property.media-updated",
      "property.media-updated",
    ]);
    expect(JSON.stringify(audits)).not.toContain("/media/properties/");

    await service.publish(PROPERTY_ID, { expectedVersion: 2 }, context);
    await expect(
      service.updateMedia(
        PROPERTY_ID,
        { expectedVersion: 3, media, coverMediaId: "media-first-0001" },
        context,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.record.publicationStatus).toBe("published");
  });

  it("publishes, unpublishes, archives, and restores only valid states", async () => {
    const { audits, service } = makeService();
    const context = {
      actorStaffIdentityId: "staff-safe-id",
      requestId: "request-lifecycle",
      occurredAt: NOW,
    };

    const published = await service.publish(
      PROPERTY_ID,
      { expectedVersion: 0 },
      context,
    );
    expect(published).toMatchObject({ publicationStatus: "published", version: 1 });
    await expect(
      service.publish(PROPERTY_ID, { expectedVersion: 1 }, context),
    ).rejects.toMatchObject({ status: 409 });

    const unpublished = await service.unpublish(
      PROPERTY_ID,
      { expectedVersion: 1 },
      context,
    );
    expect(unpublished).toMatchObject({ publicationStatus: "unpublished", version: 2 });
    const archived = await service.archive(
      PROPERTY_ID,
      { expectedVersion: 2 },
      context,
    );
    expect(archived).toMatchObject({ publicationStatus: "archived", version: 3 });
    const restored = await service.restore(
      PROPERTY_ID,
      { expectedVersion: 3 },
      context,
    );
    expect(restored).toMatchObject({ publicationStatus: "unpublished", version: 4 });
    expect(audits.map((event) => event.action)).toEqual([
      "property.published",
      "property.unpublished",
      "property.archived",
      "property.restored",
    ]);
  });

  it("enforces availability transitions and detects stale versions", async () => {
    const { audits, repository, service } = makeService();
    const context = {
      actorStaffIdentityId: "staff-safe-id",
      requestId: "request-availability",
      occurredAt: NOW,
    };
    await service.publish(PROPERTY_ID, { expectedVersion: 0 }, context);

    const reserved = await service.changeAvailability(
      PROPERTY_ID,
      { expectedVersion: 1, availability: "reserved" },
      context,
    );
    expect(reserved).toMatchObject({ availability: "reserved", version: 2 });
    await expect(
      service.changeAvailability(
        PROPERTY_ID,
        { expectedVersion: 1, availability: "sold" },
        context,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const sold = await service.changeAvailability(
      PROPERTY_ID,
      { expectedVersion: 2, availability: "sold" },
      context,
    );
    expect(sold).toMatchObject({ availability: "sold", version: 3 });
    await expect(
      service.changeAvailability(
        PROPERTY_ID,
        { expectedVersion: 3, availability: "available" },
        context,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(audits.map((event) => event.action)).toContain("property.reserved");
    expect(audits.map((event) => event.action)).toContain("property.sold");
    expect(repository.record.availability).toBe("sold");
  });

  it("treats a legacy record without a version key as version zero", async () => {
    const { repository, service } = makeService();
    delete repository.record.__v;
    const result = await service.publish(
      PROPERTY_ID,
      { expectedVersion: 0 },
      {
        actorStaffIdentityId: "staff-safe-id",
        requestId: "request-legacy-version",
        occurredAt: NOW,
      },
    );
    expect(result).toMatchObject({ publicationStatus: "published", version: 1 });
  });
});
