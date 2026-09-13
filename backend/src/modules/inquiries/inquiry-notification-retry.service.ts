import { randomUUID } from "node:crypto";
import type { CreateInquiryRequest } from "@rc/shared";
import type { Model } from "mongoose";
import { errorIdentity, operationalLogger } from "../../lib/operational-logger.js";
import { InquiryModel } from "./inquiry.model.js";
import {
  buildInquiryNotification,
  INQUIRY_NOTIFICATION_MAX_ATTEMPTS,
  inquiryNotificationErrorCode,
  inquiryNotifier,
  nextInquiryNotificationAttempt,
  type InquiryNotifier,
} from "./inquiry.notification.js";
import type { InquiryEntity, InquiryNotificationEntity } from "./inquiry.types.js";

const DEFAULT_LEASE_MS = 5 * 60_000;

export interface InquiryNotificationJob {
  inquiryId: string;
  createdAt: Date;
  request: Omit<CreateInquiryRequest, "website">;
  notification: InquiryNotificationEntity;
  leaseId: string;
}

export interface InquiryNotificationRetryStore {
  claimDue(
    now: Date,
    leaseId: string,
    leaseMs: number,
  ): Promise<InquiryNotificationJob | null>;
  markDelivered(job: InquiryNotificationJob, attemptedAt: Date): Promise<boolean>;
  markFailed(
    job: InquiryNotificationJob,
    attemptedAt: Date,
    errorCode: string,
  ): Promise<"retry-pending" | "terminal-failure" | null>;
}

type RetryInquiryRecord = Pick<
  InquiryEntity,
  | "name"
  | "email"
  | "phone"
  | "inquiryType"
  | "source"
  | "propertyId"
  | "subject"
  | "message"
  | "viewingRequest"
  | "privacyConsent"
  | "createdAt"
  | "notification"
> & { _id: unknown };

export class MongooseInquiryNotificationRetryStore implements InquiryNotificationRetryStore {
  constructor(private readonly model: Model<InquiryEntity> = InquiryModel) {}

  async claimDue(
    now: Date,
    leaseId: string,
    leaseMs: number,
  ): Promise<InquiryNotificationJob | null> {
    const record = await this.model
      .findOneAndUpdate(
        {
          "notification.attempts": { $lt: INQUIRY_NOTIFICATION_MAX_ATTEMPTS },
          $or: [
            {
              "notification.status": { $in: ["pending", "retry-pending"] },
              "notification.nextAttemptAt": { $lte: now },
              $or: [
                { "notification.leaseUntil": { $exists: false } },
                { "notification.leaseUntil": { $lte: now } },
              ],
            },
            {
              "notification.status": "sending",
              "notification.leaseUntil": { $lte: now },
            },
          ],
        },
        {
          $set: {
            "notification.status": "sending",
            "notification.leaseId": leaseId,
            "notification.leaseUntil": new Date(now.getTime() + leaseMs),
          },
        },
        { new: true, sort: { "notification.nextAttemptAt": 1, _id: 1 } },
      )
      .select(
        "+notification name email phone inquiryType source propertyId subject message viewingRequest privacyConsent createdAt",
      )
      .lean<RetryInquiryRecord | null>();
    if (!record) return null;

    return {
      inquiryId: String(record._id),
      createdAt: record.createdAt,
      request: {
        name: record.name,
        email: record.email,
        ...(record.phone ? { phone: record.phone } : {}),
        inquiryType: record.inquiryType,
        source: record.source,
        ...(record.propertyId ? { propertyId: record.propertyId } : {}),
        ...(record.subject ? { subject: record.subject } : {}),
        ...(record.message ? { message: record.message } : {}),
        ...(record.viewingRequest
          ? {
              requestedDate: record.viewingRequest.requestedDate,
              requestedTime: record.viewingRequest.requestedTime,
            }
          : {}),
        privacyConsent: true,
      },
      notification: record.notification,
      leaseId,
    };
  }

  async markDelivered(
    job: InquiryNotificationJob,
    attemptedAt: Date,
  ): Promise<boolean> {
    const result = await this.model.updateOne(
      {
        _id: job.inquiryId,
        "notification.notificationId": job.notification.notificationId,
        "notification.status": "sending",
        "notification.leaseId": job.leaseId,
      },
      {
        $set: {
          "notification.status": "delivered",
          "notification.attempts": job.notification.attempts + 1,
          "notification.lastAttemptAt": attemptedAt,
          "notification.deliveredAt": attemptedAt,
        },
        $unset: {
          "notification.nextAttemptAt": 1,
          "notification.lastErrorCode": 1,
          "notification.leaseId": 1,
          "notification.leaseUntil": 1,
        },
      },
    );
    return result.modifiedCount === 1;
  }

  async markFailed(
    job: InquiryNotificationJob,
    attemptedAt: Date,
    errorCode: string,
  ): Promise<"retry-pending" | "terminal-failure" | null> {
    const attempts = job.notification.attempts + 1;
    const status =
      attempts >= INQUIRY_NOTIFICATION_MAX_ATTEMPTS
        ? "terminal-failure"
        : "retry-pending";
    const result = await this.model.updateOne(
      {
        _id: job.inquiryId,
        "notification.notificationId": job.notification.notificationId,
        "notification.status": "sending",
        "notification.leaseId": job.leaseId,
      },
      {
        $set: {
          "notification.status": status,
          "notification.attempts": attempts,
          "notification.lastAttemptAt": attemptedAt,
          "notification.lastErrorCode": errorCode,
          ...(status === "retry-pending"
            ? {
                "notification.nextAttemptAt": nextInquiryNotificationAttempt(
                  attempts,
                  attemptedAt,
                ),
              }
            : {}),
        },
        $unset: {
          ...(status === "terminal-failure" ? { "notification.nextAttemptAt": 1 } : {}),
          "notification.leaseId": 1,
          "notification.leaseUntil": 1,
        },
      },
    );
    return result.modifiedCount === 1 ? status : null;
  }
}

export interface NotificationRetryBatchResult {
  attempted: number;
  delivered: number;
  retryPending: number;
  terminalFailures: number;
  leaseConflicts: number;
}

export class InquiryNotificationRetryService {
  constructor(
    private readonly store: InquiryNotificationRetryStore,
    private readonly notifier: InquiryNotifier,
    private readonly leaseMs = DEFAULT_LEASE_MS,
  ) {}

  async processDue(limit: number, now: () => Date = () => new Date()) {
    if (this.notifier.configured !== true) {
      throw new Error("Inquiry notification retry provider is not configured.");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("Notification retry limit must be an integer from 1 to 500.");
    }

    const result: NotificationRetryBatchResult = {
      attempted: 0,
      delivered: 0,
      retryPending: 0,
      terminalFailures: 0,
      leaseConflicts: 0,
    };
    while (result.attempted < limit) {
      const job = await this.store.claimDue(now(), randomUUID(), this.leaseMs);
      if (!job) break;
      result.attempted += 1;
      const attemptedAt = now();
      try {
        await this.notifier.send(
          buildInquiryNotification(job.inquiryId, job.request, job.createdAt),
          { idempotencyKey: job.notification.notificationId },
        );
        if (await this.store.markDelivered(job, attemptedAt)) result.delivered += 1;
        else result.leaseConflicts += 1;
      } catch (error) {
        const errorCode = inquiryNotificationErrorCode(error);
        const status = await this.store.markFailed(job, attemptedAt, errorCode);
        if (status === "retry-pending") result.retryPending += 1;
        else if (status === "terminal-failure") result.terminalFailures += 1;
        else result.leaseConflicts += 1;
        operationalLogger.warn("inquiry_notification_retry_failed", {
          dependency: "email",
          entityType: "inquiry",
          entityId: job.inquiryId,
          errorCode,
          ...errorIdentity(error),
        });
      }
    }
    return result;
  }
}

export const mongooseInquiryNotificationRetryService =
  new InquiryNotificationRetryService(
    new MongooseInquiryNotificationRetryStore(),
    inquiryNotifier,
  );
