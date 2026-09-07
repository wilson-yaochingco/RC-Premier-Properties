import type { CreateInquiryRequest } from "@rc/shared";
import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { InquiryModel } from "../src/modules/inquiries/inquiry.model.js";
import { MongooseInquiryService } from "../src/modules/inquiries/inquiry.service.js";
import type { InquiryEntity } from "../src/modules/inquiries/inquiry.types.js";

const REQUEST: Omit<CreateInquiryRequest, "website"> = {
  name: "Maria Retry",
  email: "retry@example.test",
  inquiryType: "general",
  source: "contact-page",
  message: "This request is safe to retry with the same key.",
  privacyConsent: true,
};

describe("public inquiry idempotency", () => {
  it("returns the original acknowledgement after a duplicate idempotency key race", async () => {
    const createdAt = new Date("2026-09-07T08:00:00.000Z");
    const persisted = { _id: "507f191e810c19729de860ea", createdAt };
    const duplicate = Object.assign(new Error("duplicate key"), { code: 11000 });
    const create = vi
      .fn()
      .mockResolvedValueOnce(persisted)
      .mockRejectedValueOnce(duplicate);
    const findOne = vi.fn(() => ({
      select: () => ({ lean: async () => persisted }),
    }));
    const model = { create, findOne } as unknown as Model<InquiryEntity>;
    const service = new MongooseInquiryService(model);

    const first = await service.create(REQUEST, "same-public-request-key");
    const retry = await service.create(REQUEST, "same-public-request-key");

    expect(retry).toEqual(first);
    expect(findOne).toHaveBeenCalledWith({
      idempotencyKeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(create.mock.calls)).not.toContain("same-public-request-key");
  });

  it("defines recovery, history, quarantine, and idempotency indexes on the inquiry model", () => {
    const indexes = InquiryModel.schema.indexes();
    expect(indexes).toContainEqual([{ archivedAt: 1, createdAt: -1 }, {}]);
    expect(indexes).toContainEqual([
      { idempotencyKeyHash: 1 },
      expect.objectContaining({ unique: true, sparse: true }),
    ]);
    expect(InquiryModel.schema.get("versionKey")).toBe("__v");
  });
});
