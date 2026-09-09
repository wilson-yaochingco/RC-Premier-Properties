import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createOperationalLogger } from "../src/lib/operational-logger.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../src/lib/operational-target.js";
import { requestContext } from "../src/middleware/requestContext.js";
import { createRequestLogging } from "../src/middleware/requestLogging.js";
import {
  InquiryNotificationRetryService,
  type InquiryNotificationJob,
  type InquiryNotificationRetryStore,
} from "../src/modules/inquiries/inquiry-notification-retry.service.js";
import { nextInquiryNotificationAttempt } from "../src/modules/inquiries/inquiry.notification.js";
import {
  inspectDataIntegrity,
  type IntegritySnapshot,
} from "../src/modules/operations/integrity.service.js";
import { PropertyMediaCleanupTaskModel } from "../src/modules/properties/property-media-cleanup.model.js";

describe("structured operational logging", () => {
  it("uses a server request ID and logs only allowlisted request metadata", async () => {
    const lines: string[] = [];
    const logger = createOperationalLogger("debug", (_level, line) => lines.push(line));
    const app = express();
    app.use(requestContext);
    app.use(createRequestLogging(logger));
    app.use(express.json());
    app.post("/submit", (_req, res) => res.status(201).json({ accepted: true }));

    const response = await request(app)
      .post("/submit?email=private@example.test")
      .set("X-Request-ID", "caller-controlled-private-value")
      .set("Authorization", "Bearer provider-token")
      .set("Cookie", "rc_session=secret-session")
      .send({ message: "private inquiry body" });

    expect(response.headers["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers["x-request-id"]).not.toBe(
      "caller-controlled-private-value",
    );
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      severity: "info",
      event: "http_request_completed",
      method: "POST",
      route: "/submit",
      statusCode: 201,
      requestId: response.headers["x-request-id"],
    });
    const serialized = lines.join("\n");
    expect(serialized).not.toContain("private@example.test");
    expect(serialized).not.toContain("provider-token");
    expect(serialized).not.toContain("secret-session");
    expect(serialized).not.toContain("private inquiry body");
  });
});

function retryJob(attempts: number): InquiryNotificationJob {
  return {
    inquiryId: "507f191e810c19729de860ea",
    createdAt: new Date("2026-09-09T00:00:00.000Z"),
    request: {
      name: "Synthetic Retry",
      email: "synthetic@example.test",
      inquiryType: "general",
      source: "contact-page",
      privacyConsent: true,
    },
    notification: {
      notificationId: "stable-notification-id",
      status: "retry-pending",
      attempts,
    },
    leaseId: "lease-id",
  };
}

describe("inquiry notification retries", () => {
  it("uses stable idempotency, bounded backoff, and terminal failure", async () => {
    const job = retryJob(4);
    const store: InquiryNotificationRetryStore = {
      claimDue: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(null),
      markDelivered: vi.fn(),
      markFailed: vi.fn().mockResolvedValue("terminal-failure"),
    };
    const send = vi.fn().mockRejectedValue(
      Object.assign(new Error("customer data must not be logged"), {
        code: "provider_unavailable",
      }),
    );
    const service = new InquiryNotificationRetryService(store, {
      configured: true,
      send,
    });

    const result = await service.processDue(
      10,
      () => new Date("2026-09-09T01:00:00.000Z"),
    );

    expect(result).toMatchObject({ attempted: 1, terminalFailures: 1 });
    expect(send).toHaveBeenCalledWith(expect.any(Object), {
      idempotencyKey: "stable-notification-id",
    });
    expect(store.markFailed).toHaveBeenCalledWith(
      job,
      new Date("2026-09-09T01:00:00.000Z"),
      "provider_unavailable",
    );
    expect(nextInquiryNotificationAttempt(1, new Date(0))).toEqual(
      new Date(5 * 60_000),
    );
    expect(nextInquiryNotificationAttempt(4, new Date(0))).toEqual(
      new Date(360 * 60_000),
    );
  });

  it("fails closed without a configured provider and never claims work", async () => {
    const claimDue = vi.fn();
    const service = new InquiryNotificationRetryService(
      {
        claimDue,
        markDelivered: vi.fn(),
        markFailed: vi.fn(),
      },
      { configured: false, send: vi.fn() },
    );

    await expect(service.processDue(10)).rejects.toThrow("not configured");
    expect(claimDue).not.toHaveBeenCalled();
  });
});

describe("operational command safety", () => {
  it("requires an explicit target and confirmation for production mutation", () => {
    expect(() => parseOperationalArguments([])).toThrow("explicit --target");
    const production = parseOperationalArguments(["--target", "production"]);
    expect(() => assertOperationalTarget(production, "production", true)).toThrow(
      "--confirm-production",
    );
    expect(() =>
      assertOperationalTarget(
        parseOperationalArguments(["--target=production", "--confirm-production"]),
        "production",
        true,
      ),
    ).not.toThrow();
    expect(() =>
      assertOperationalTarget(
        parseOperationalArguments(["--target=staging"]),
        "development",
        false,
      ),
    ).toThrow("NODE_ENV=production");
  });
});

describe("media cleanup debt", () => {
  it("keeps object references private and has no automatic expiry", () => {
    expect(
      PropertyMediaCleanupTaskModel.schema.path("objectReference")?.options.select,
    ).toBe(false);
    expect(
      PropertyMediaCleanupTaskModel.schema
        .indexes()
        .some(([fields]) => "referenceHash" in fields && "status" in fields),
    ).toBe(true);
    expect(
      PropertyMediaCleanupTaskModel.schema
        .indexes()
        .some(([, options]) => "expireAfterSeconds" in options),
    ).toBe(false);
  });
});

describe("read-only data integrity", () => {
  it("reports relationships and cleanup debt without PII or mutation instructions", () => {
    const snapshot: IntegritySnapshot = {
      properties: [
        {
          _id: "507f191e810c19729de86001",
          propertyId: "RCPP-25",
          slug: "premier-property-25",
          purpose: "sale",
          publicationStatus: "published",
          gallery: [{ id: "media-1", url: "/media/one.webp" }],
          coverMedia: { id: "missing-cover", url: "/media/missing.webp" },
        },
      ],
      inquiries: [
        {
          _id: "507f191e810c19729de86002",
          propertyId: "MISSING-PROPERTY",
          inquiryType: "viewing",
          status: "new",
          statusHistory: [{ toStatus: "in-progress" }],
          notification: {
            notificationId: "notification-1",
            status: "terminal-failure",
            attempts: 5,
          },
        },
      ],
      cleanupDebt: [
        {
          _id: "507f191e810c19729de86003",
          property: "507f191e810c19729de86001",
          status: "pending-review",
        },
      ],
    };

    const before = structuredClone(snapshot);
    const report = inspectDataIntegrity(snapshot, new Date("2026-09-09T02:00:00.000Z"));

    expect(report.mode).toBe("scan-only");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "property_cover_not_in_gallery",
        "inquiry_property_missing",
        "viewing_relationship_incomplete",
        "inquiry_history_inconsistent",
        "notification_terminal_failure",
        "media_cleanup_requires_review",
      ]),
    );
    expect(snapshot).toEqual(before);
    expect(JSON.stringify(report)).not.toContain("synthetic@example.test");
  });
});
