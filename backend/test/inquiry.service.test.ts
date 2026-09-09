import type { CreateInquiryRequest } from "@rc/shared";
import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { InquiryModel } from "../src/modules/inquiries/inquiry.model.js";
import {
  InquiryNotificationRetryService,
  type InquiryNotificationRetryStore,
} from "../src/modules/inquiries/inquiry-notification-retry.service.js";
import {
  MongooseInquiryNotificationStateStore,
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

function propertyReferences(known = true, requestable = true) {
  return {
    isKnownPropertyId: vi.fn().mockResolvedValue(known),
    isRequestablePropertyId: vi.fn().mockResolvedValue(requestable),
  };
}

describe("initial notification lease ownership", () => {
  it.each(["success", "failure"] as const)(
    "keeps the retry worker out while the initial %s is in flight",
    async (outcome) => {
      let persistedNotification: InquiryEntity["notification"] | undefined;
      let releaseInitial!: () => void;
      let markInitialStarted!: () => void;
      const initialGate = new Promise<void>((resolve) => {
        releaseInitial = resolve;
      });
      const initialStarted = new Promise<void>((resolve) => {
        markInitialStarted = resolve;
      });
      const create = vi.fn(async (input: Partial<InquiryEntity>) => {
        persistedNotification = input.notification;
        return {
          ...input,
          _id: "507f191e810c19729de860ea",
          createdAt: new Date("2026-09-09T04:00:00.000Z"),
          inquiryType: "general",
        };
      });
      const initialSend = vi.fn(async () => {
        markInitialStarted();
        await initialGate;
        if (outcome === "failure") throw new Error("controlled provider failure");
      });
      const state = notificationState();
      const service = new MongooseInquiryService(
        { create } as unknown as Model<InquiryEntity>,
        propertyReferences(),
        { configured: true, send: initialSend },
        state,
      );
      const retrySend = vi.fn();
      const retryStore: InquiryNotificationRetryStore = {
        claimDue: vi.fn(async (now) => {
          const notification = persistedNotification;
          const activeInitialLease =
            notification?.status === "sending" &&
            notification.attempts === 0 &&
            notification.leaseUntil !== undefined &&
            notification.leaseUntil > now;
          expect(activeInitialLease).toBe(true);
          return null;
        }),
        markDelivered: vi.fn(),
        markFailed: vi.fn(),
      };
      const retryService = new InquiryNotificationRetryService(retryStore, {
        configured: true,
        send: retrySend,
      });

      const creation = service.create(REQUEST);
      await initialStarted;
      const leaseUntil = persistedNotification?.leaseUntil;
      expect(leaseUntil).toBeInstanceOf(Date);
      await expect(
        retryService.processDue(1, () => new Date(leaseUntil!.getTime() - 1)),
      ).resolves.toMatchObject({ attempted: 0 });
      expect(retrySend).not.toHaveBeenCalled();

      releaseInitial();
      await expect(creation).resolves.toMatchObject({ status: "received" });
      if (outcome === "success") {
        expect(state.markInitialDelivered).toHaveBeenCalledOnce();
        expect(state.markInitialFailed).not.toHaveBeenCalled();
      } else {
        expect(state.markInitialFailed).toHaveBeenCalledOnce();
        expect(state.markInitialDelivered).not.toHaveBeenCalled();
      }
    },
  );

  it.each(["delivered", "failed"] as const)(
    "settles an initial %s result only for its active lease",
    async (outcome) => {
      const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
      const state = new MongooseInquiryNotificationStateStore({
        updateOne,
      } as unknown as Model<InquiryEntity>);
      const attemptedAt = new Date("2026-09-09T04:00:00.000Z");

      if (outcome === "delivered") {
        await state.markInitialDelivered(
          "507f191e810c19729de860ea",
          "notification-id",
          "initial-lease-id",
          attemptedAt,
        );
      } else {
        await state.markInitialFailed(
          "507f191e810c19729de860ea",
          "notification-id",
          "initial-lease-id",
          attemptedAt,
          new Date("2026-09-09T04:05:00.000Z"),
          "provider_unavailable",
        );
      }

      expect(updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          "notification.notificationId": "notification-id",
          "notification.status": "sending",
          "notification.attempts": 0,
          "notification.leaseId": "initial-lease-id",
        }),
        expect.any(Object),
      );
    },
  );

  it("indexes active sending leases used to exclude concurrent retry claims", () => {
    expect(
      InquiryModel.schema
        .indexes()
        .some(
          ([fields]) =>
            fields["notification.status"] === 1 &&
            fields["notification.leaseUntil"] === 1,
        ),
    ).toBe(true);
  });
});

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
      propertyReferences(),
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
          status: "sending",
          attempts: 0,
          notificationId: expect.stringMatching(/^[a-f0-9-]{36}$/),
          leaseId: expect.stringMatching(/^[a-f0-9-]{36}$/),
          leaseUntil: expect.any(Date),
        }),
      }),
    );
    expect(state.markInitialFailed).toHaveBeenCalledWith(
      "507f191e810c19729de860ea",
      expect.stringMatching(/^[a-f0-9-]{36}$/),
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
      propertyReferences(),
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
    const properties = propertyReferences();
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

  it("rejects a nonexistent optional property reference for non-viewing inquiries", async () => {
    const create = vi.fn();
    const properties = propertyReferences(false, false);
    const service = new MongooseInquiryService(
      { create } as unknown as Model<InquiryEntity>,
      properties,
      { configured: true, send: vi.fn() },
      notificationState(),
    );

    await expect(
      service.create({ ...REQUEST, inquiryType: "property", propertyId: "MISSING" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(properties.isKnownPropertyId).toHaveBeenCalledWith("MISSING");
    expect(create).not.toHaveBeenCalled();
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
      propertyType: { $in: ["house-and-lot", "townhouse", "lot"] },
      availability: { $ne: "sold" },
    });
    await expect(repository.isKnownPropertyId("RCPP-ADMIN-001")).resolves.toBe(true);
    expect(exists).toHaveBeenLastCalledWith({ propertyId: "RCPP-ADMIN-001" });
  });
});
