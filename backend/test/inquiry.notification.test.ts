import type { CreateInquiryRequest } from "@rc/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InquiryNotificationJob } from "../src/modules/inquiries/inquiry-notification-retry.service.js";

const RECEIVED_AT = new Date("2026-09-13T00:00:00.000Z");
const REQUEST: Omit<CreateInquiryRequest, "website"> = {
  name: "Beta Test",
  email: "customer@example.test",
  inquiryType: "general",
  source: "contact-page",
  privacyConsent: true,
};

describe("configured inquiry notification destination", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BUSINESS_NOTIFICATION_EMAIL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each(["general", "selling", "viewing", "property"] as const)(
    "addresses existing %s notifications to the shared business mailbox",
    async (inquiryType) => {
      const { buildInquiryNotification } =
        await import("../src/modules/inquiries/inquiry.notification.js");
      const message = buildInquiryNotification(
        "beta-inquiry",
        { ...REQUEST, inquiryType },
        RECEIVED_AT,
      );
      expect(message.to).toBe("rcpremierph@gmail.com");
      expect(message).not.toHaveProperty("from");
      expect(message.text).toContain(
        "Admin: http://localhost:3000/admin/inquiries/beta-inquiry",
      );
    },
  );

  it("uses the environment recipient on initial construction and retry with the stable delivery key", async () => {
    vi.stubEnv("BUSINESS_NOTIFICATION_EMAIL", " ACCEPTANCE@example.test ");
    const { buildInquiryNotification } =
      await import("../src/modules/inquiries/inquiry.notification.js");
    const { InquiryNotificationRetryService } =
      await import("../src/modules/inquiries/inquiry-notification-retry.service.js");
    const initial = buildInquiryNotification("beta-inquiry", REQUEST, RECEIVED_AT);
    expect(initial.to).toBe("acceptance@example.test");
    const job: InquiryNotificationJob = {
      inquiryId: "beta-inquiry",
      createdAt: RECEIVED_AT,
      request: REQUEST,
      leaseId: "retry-lease",
      notification: {
        notificationId: "stable-notification-key",
        status: "sending",
        attempts: 1,
      },
    };
    const send = vi.fn().mockResolvedValue(undefined);
    const store = {
      claimDue: vi.fn().mockResolvedValueOnce(job).mockResolvedValue(null),
      markDelivered: vi.fn().mockResolvedValue(true),
      markFailed: vi.fn(),
    };
    await expect(
      new InquiryNotificationRetryService(store, { configured: true, send }).processDue(
        1,
      ),
    ).resolves.toMatchObject({ attempted: 1, delivered: 1 });
    expect(send).toHaveBeenCalledWith(initial, {
      idempotencyKey: "stable-notification-key",
    });
  });

  it("rejects an invalid configured recipient at startup", async () => {
    vi.stubEnv("BUSINESS_NOTIFICATION_EMAIL", "invalid-recipient");
    await expect(import("../src/config/env.js")).rejects.toThrow(
      /BUSINESS_NOTIFICATION_EMAIL/,
    );
  });
});
