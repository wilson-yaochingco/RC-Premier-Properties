import type { CreateInquiryRequest } from "@rc/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InquiryNotificationJob } from "../src/modules/inquiries/inquiry-notification-retry.service.js";

const RECEIVED_AT = new Date("2026-09-13T00:00:00.000Z");
const REQUEST: Omit<CreateInquiryRequest, "website"> = {
  name: "Beta Test",
  email: "customer@example.test",
  phone: "+63 917 555 0110",
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

  it("includes subject and requested schedule only when the inquiry carries them", async () => {
    const { buildInquiryNotification } =
      await import("../src/modules/inquiries/inquiry.notification.js");
    const seller = buildInquiryNotification(
      "seller-inquiry",
      {
        ...REQUEST,
        inquiryType: "selling",
        source: "sell-page",
        subject: "Angeles City",
      },
      RECEIVED_AT,
    );
    expect(seller.text).toContain("Subject: Angeles City");
    expect(seller.text).not.toContain("Requested date");

    const viewing = buildInquiryNotification(
      "viewing-inquiry",
      {
        ...REQUEST,
        inquiryType: "viewing",
        source: "viewing-page",
        propertyId: "RCPP-001",
        requestedDate: "2026-09-14",
        requestedTime: "10:30",
      },
      RECEIVED_AT,
    );
    for (const line of [
      "Inquiry: viewing-inquiry",
      "Type: viewing",
      "Property: PREMIER PROPERTY #RCPP-001",
      "Name: Beta Test",
      "Email: customer@example.test",
      "Phone: +63 917 555 0110",
      "Requested date: 2026-09-14 (Philippine time)",
      "Requested time: 10:30 (Philippine time)",
      `Received: ${RECEIVED_AT.toISOString()}`,
      "Admin: http://localhost:3000/admin/inquiries/viewing-inquiry",
    ]) {
      expect(viewing.text).toContain(line);
    }
    expect(viewing.text).not.toContain("Subject:");
  });

  it("keeps the production notifier disabled until a provider is selected", async () => {
    const { inquiryNotifier, DisabledInquiryNotifier } =
      await import("../src/modules/inquiries/inquiry.notification.js");
    expect(inquiryNotifier).toBeInstanceOf(DisabledInquiryNotifier);
    expect(inquiryNotifier.configured).toBe(false);
    await expect(
      inquiryNotifier.send(
        { to: "x@example.test", subject: "s", text: "t" },
        { idempotencyKey: "k" },
      ),
    ).rejects.toMatchObject({ code: "provider_not_configured" });
  });

  it("rejects an invalid configured recipient at startup", async () => {
    vi.stubEnv("BUSINESS_NOTIFICATION_EMAIL", "invalid-recipient");
    await expect(import("../src/config/env.js")).rejects.toThrow(
      /BUSINESS_NOTIFICATION_EMAIL/,
    );
  });
});
