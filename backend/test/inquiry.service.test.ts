import type { CreateInquiryRequest } from "@rc/shared";
import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { InquiryModel } from "../src/modules/inquiries/inquiry.model.js";
import {
  MongooseInquiryService,
  MongooseViewingPropertyRepository,
} from "../src/modules/inquiries/inquiry.service.js";
import type { InquiryEntity } from "../src/modules/inquiries/inquiry.types.js";
import type { PropertyEntity } from "../src/modules/properties/property.types.js";

const REQUEST: Omit<CreateInquiryRequest, "website"> = {
  name: "Maria Retry",
  email: "retry@example.test",
  inquiryType: "general",
  source: "contact-page",
  message: "This request is safe to retry with the same key.",
  privacyConsent: true,
};

function notificationState() {
  return {
    markInitialDelivered: vi.fn().mockResolvedValue(undefined),
    markInitialFailed: vi.fn().mockResolvedValue(undefined),
  };
}

describe("public inquiry idempotency", () => {
  it("attempts the official notification only after persistence and does not lose an inquiry when delivery fails", async () => {
    const createdAt = new Date("2026-09-07T08:00:00.000Z");
    const create = vi.fn().mockResolvedValue({
      _id: "507f191e810c19729de860ea",
      createdAt,
      inquiryType: "general",
    });
    const send = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const state = notificationState();
    const service = new MongooseInquiryService(
      { create } as unknown as Model<InquiryEntity>,
      { isRequestablePropertyId: vi.fn() },
      { send },
      state,
    );

    await expect(service.create(REQUEST)).resolves.toMatchObject({
      inquiryId: "507f191e810c19729de860ea",
      status: "received",
    });
    expect(create).toHaveBeenCalledBefore(send);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "rcpremierph@gmail.com",
        subject: "New RC Premier Inquiry — General inquiry",
      }),
      { idempotencyKey: expect.stringMatching(/^[a-f0-9-]{36}$/) },
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          status: "pending",
          attempts: 0,
          notificationId: expect.stringMatching(/^[a-f0-9-]{36}$/),
        }),
      }),
    );
    expect(state.markInitialFailed).toHaveBeenCalledWith(
      "507f191e810c19729de860ea",
      expect.stringMatching(/^[a-f0-9-]{36}$/),
      expect.any(Date),
      expect.any(Date),
      "provider_delivery_failed",
    );
  });

  it("returns the original acknowledgement after a duplicate idempotency key race", async () => {
    const createdAt = new Date("2026-09-07T08:00:00.000Z");
    const persisted = { _id: "507f191e810c19729de860ea", createdAt };
    const create = vi
      .fn()
      .mockResolvedValueOnce({ ...persisted, inquiryType: "general" });
    const lean = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...persisted,
        inquiryType: "general",
      });
    const findOne = vi.fn(() => ({ select: () => ({ lean }) }));
    const model = { create, findOne } as unknown as Model<InquiryEntity>;
    const service = new MongooseInquiryService(
      model,
      { isRequestablePropertyId: vi.fn() },
      { configured: true, send: vi.fn().mockResolvedValue(undefined) },
      notificationState(),
    );

    const first = await service.create(REQUEST, "same-public-request-key");
    const retry = await service.create(REQUEST, "same-public-request-key");

    expect(retry).toEqual(first);
    expect(findOne).toHaveBeenLastCalledWith({
      idempotencyKeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(create.mock.calls)).not.toContain("same-public-request-key");
  });

  it("stores a structured viewing request only for a requestable published property", async () => {
    const createdAt = new Date("2026-09-07T08:00:00.000Z");
    const create = vi.fn().mockImplementation(async (input) => ({
      ...input,
      _id: "507f191e810c19729de860ea",
      createdAt,
    }));
    const model = { create } as unknown as Model<InquiryEntity>;
    const properties = { isRequestablePropertyId: vi.fn().mockResolvedValue(true) };
    const service = new MongooseInquiryService(
      model,
      properties,
      { configured: true, send: vi.fn().mockResolvedValue(undefined) },
      notificationState(),
    );

    const response = await service.create({
      name: "Maria Viewing",
      email: "viewing@example.test",
      inquiryType: "viewing",
      source: "viewing-page",
      propertyId: "RCPP-ADMIN-001",
      requestedDate: "2026-09-20",
      requestedTime: "10:30",
      privacyConsent: true,
    });

    expect(properties.isRequestablePropertyId).toHaveBeenCalledWith("RCPP-ADMIN-001");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "RCPP-ADMIN-001",
        viewingRequest: expect.objectContaining({
          status: "requested",
          requestedDate: "2026-09-20",
          requestedTime: "10:30",
        }),
      }),
    );
    expect(response.message).toContain("not yet an appointment");

    properties.isRequestablePropertyId.mockResolvedValue(false);
    await expect(
      service.create({
        name: "Maria Viewing",
        email: "viewing@example.test",
        inquiryType: "viewing",
        source: "viewing-page",
        propertyId: "RCPP-SOLD-001",
        requestedDate: "2026-09-20",
        requestedTime: "10:30",
        privacyConsent: true,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("defines recovery, history, quarantine, and idempotency indexes on the inquiry model", () => {
    const indexes = InquiryModel.schema.indexes();
    expect(indexes).toContainEqual([{ archivedAt: 1, createdAt: -1 }, {}]);
    expect(indexes).toContainEqual([
      { idempotencyKeyHash: 1 },
      expect.objectContaining({ unique: true, sparse: true }),
    ]);
    expect(indexes).toContainEqual([
      { "notification.notificationId": 1 },
      expect.objectContaining({ unique: true, sparse: true }),
    ]);
    expect(InquiryModel.schema.path("notification")?.options.select).toBe(false);
    expect(InquiryModel.schema.get("versionKey")).toBe("__v");
  });

  it("limits viewing relationships to published, not-sold sale properties", async () => {
    const exists = vi.fn().mockResolvedValue({ _id: "property" });
    const repository = new MongooseViewingPropertyRepository({
      exists,
    } as unknown as Model<PropertyEntity>);

    await expect(repository.isRequestablePropertyId("RCPP-ADMIN-001")).resolves.toBe(
      true,
    );
    expect(exists).toHaveBeenCalledWith({
      propertyId: "RCPP-ADMIN-001",
      publicationStatus: "published",
      purpose: "sale",
      availability: { $ne: "sold" },
    });
  });
});
