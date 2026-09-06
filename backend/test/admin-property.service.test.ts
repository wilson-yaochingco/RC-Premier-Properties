import type {
  CreateDraftPropertyRequest,
  UpdateDraftPropertyRequest,
} from "@rc/shared";
import { describe, expect, it } from "vitest";
import type { SecurityAuditEventInput } from "../src/modules/auth/auth.types.js";
import { DefaultAdminPropertyService } from "../src/modules/properties/property.service.js";
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

  async list() {
    return { records: [this.record], total: 1 };
  }

  async findById(id: string) {
    return id === PROPERTY_ID ? this.record : null;
  }

  async createDraft(input: DraftPropertyPersistenceInput) {
    this.created = input;
    this.record = recordFrom(input);
    return this.record;
  }

  async updateDraft(_id: string, input: Partial<PropertyContentPersistenceInput>) {
    this.updated = input;
    return this.updateResult;
  }
}

function makeService() {
  const repository = new MemoryAdminPropertyRepository();
  const audits: SecurityAuditEventInput[] = [];
  const service = new DefaultAdminPropertyService(repository, {
    async recordAudit(event) {
      audits.push(event);
    },
  });
  return { audits, repository, service };
}

describe("admin property service", () => {
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

  it("edits only supplied content and audits changed field names exactly once", async () => {
    const { audits, repository, service } = makeService();
    const request: UpdateDraftPropertyRequest = {
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

  it("does not audit an edit when no draft transitions", async () => {
    const { audits, repository, service } = makeService();
    repository.updateResult = null;

    await expect(
      service.updateDraft(
        PROPERTY_ID,
        { title: "Unavailable update" },
        {
          actorStaffIdentityId: "staff-safe-id",
          requestId: "request-missing",
          occurredAt: NOW,
        },
      ),
    ).resolves.toBeNull();
    expect(audits).toHaveLength(0);
  });
});
