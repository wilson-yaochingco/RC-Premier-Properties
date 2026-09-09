import { INQUIRY_NOTIFICATION_MAX_ATTEMPTS } from "../inquiries/inquiry.notification.js";
import { InquiryModel } from "../inquiries/inquiry.model.js";
import { PropertyMediaCleanupTaskModel } from "../properties/property-media-cleanup.model.js";
import { PropertyModel } from "../properties/property.model.js";

export type IntegritySeverity = "warning" | "error";

export interface IntegrityFinding {
  severity: IntegritySeverity;
  code: string;
  entityType: "property" | "inquiry" | "media-cleanup";
  entityId: string;
}

export interface IntegrityPropertyRecord {
  _id: unknown;
  propertyId?: string;
  slug?: string;
  purpose?: string;
  publicationStatus?: string;
  coverMedia?: { id?: string; url?: string };
  gallery?: Array<{ id?: string; url?: string }>;
}

export interface IntegrityInquiryRecord {
  _id: unknown;
  propertyId?: string;
  inquiryType?: string;
  status?: string;
  statusHistory?: Array<{ toStatus?: string }>;
  viewingRequest?: {
    status?: string;
    statusHistory?: Array<{ toStatus?: string }>;
  };
  notification?: {
    notificationId?: string;
    status?: string;
    attempts?: number;
    nextAttemptAt?: Date;
    leaseUntil?: Date;
  };
}

export interface IntegrityCleanupRecord {
  _id: unknown;
  property?: unknown;
  status?: string;
}

export interface IntegritySnapshot {
  properties: IntegrityPropertyRecord[];
  inquiries: IntegrityInquiryRecord[];
  cleanupDebt: IntegrityCleanupRecord[];
}

export interface IntegrityReport {
  mode: "scan-only";
  generatedAt: string;
  counts: {
    properties: number;
    inquiries: number;
    cleanupDebt: number;
    warnings: number;
    errors: number;
  };
  findings: IntegrityFinding[];
}

function entityId(value: unknown): string {
  const id = String(value);
  return /^[a-f0-9]{24}$/i.test(id) ? id : "unknown";
}

function duplicateValues<T>(
  records: T[],
  value: (record: T) => string | undefined,
): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of records) {
    const candidate = value(record);
    if (!candidate) continue;
    if (seen.has(candidate)) duplicates.add(candidate);
    seen.add(candidate);
  }
  return duplicates;
}

/**
 * Evaluate only relationship and lifecycle metadata. It never repairs, renumbers, or
 * serializes customer fields, private locations, media URLs, or storage credentials.
 */
export function inspectDataIntegrity(
  snapshot: IntegritySnapshot,
  now: Date = new Date(),
): IntegrityReport {
  const findings: IntegrityFinding[] = [];
  const add = (
    severity: IntegritySeverity,
    code: string,
    type: IntegrityFinding["entityType"],
    id: unknown,
  ) => findings.push({ severity, code, entityType: type, entityId: entityId(id) });

  const duplicatePropertyIds = duplicateValues(snapshot.properties, (record) =>
    record.propertyId?.toUpperCase(),
  );
  const duplicateSlugs = duplicateValues(snapshot.properties, (record) => record.slug);
  const propertyIds = new Set(
    snapshot.properties.flatMap((record) =>
      record.propertyId ? [record.propertyId.toUpperCase()] : [],
    ),
  );

  for (const property of snapshot.properties) {
    if (
      !property.propertyId ||
      !/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(property.propertyId)
    ) {
      add("error", "property_id_missing_or_invalid", "property", property._id);
    } else if (duplicatePropertyIds.has(property.propertyId.toUpperCase())) {
      add("error", "property_id_duplicate", "property", property._id);
    }
    if (!property.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(property.slug)) {
      add("error", "property_slug_missing_or_invalid", "property", property._id);
    } else if (duplicateSlugs.has(property.slug)) {
      add("error", "property_slug_duplicate", "property", property._id);
    }
    if (property.purpose !== "sale") {
      add(
        property.publicationStatus === "published" ? "error" : "warning",
        "non_sale_property_record",
        "property",
        property._id,
      );
    }

    const gallery = property.gallery ?? [];
    const mediaIds = duplicateValues(gallery, (media) => media.id);
    const mediaUrls = duplicateValues(gallery, (media) => media.url);
    for (const media of gallery) {
      if (!media.id || !media.url) {
        add("error", "property_media_identity_missing", "property", property._id);
      } else if (mediaIds.has(media.id) || mediaUrls.has(media.url)) {
        add("error", "property_media_duplicate", "property", property._id);
      }
    }
    if (
      property.coverMedia &&
      !gallery.some(
        (media) =>
          media.id === property.coverMedia?.id &&
          media.url === property.coverMedia?.url,
      )
    ) {
      add("error", "property_cover_not_in_gallery", "property", property._id);
    }
  }

  const duplicateNotificationIds = duplicateValues(
    snapshot.inquiries,
    (record) => record.notification?.notificationId,
  );
  for (const inquiry of snapshot.inquiries) {
    if (inquiry.propertyId && !propertyIds.has(inquiry.propertyId.toUpperCase())) {
      add("error", "inquiry_property_missing", "inquiry", inquiry._id);
    }
    if (
      inquiry.inquiryType === "viewing" &&
      (!inquiry.propertyId || !inquiry.viewingRequest)
    ) {
      add("error", "viewing_relationship_incomplete", "inquiry", inquiry._id);
    }
    if (inquiry.inquiryType !== "viewing" && inquiry.viewingRequest) {
      add("error", "viewing_relationship_unexpected", "inquiry", inquiry._id);
    }
    const latestInquiryStatus = inquiry.statusHistory?.at(-1)?.toStatus;
    if (latestInquiryStatus && latestInquiryStatus !== inquiry.status) {
      add("error", "inquiry_history_inconsistent", "inquiry", inquiry._id);
    }
    const latestViewingStatus = inquiry.viewingRequest?.statusHistory?.at(-1)?.toStatus;
    if (latestViewingStatus && latestViewingStatus !== inquiry.viewingRequest?.status) {
      add("error", "viewing_history_inconsistent", "inquiry", inquiry._id);
    }

    const notification = inquiry.notification;
    if (!notification?.notificationId) {
      add("warning", "notification_state_missing", "inquiry", inquiry._id);
      continue;
    }
    if (duplicateNotificationIds.has(notification.notificationId)) {
      add("error", "notification_identity_duplicate", "inquiry", inquiry._id);
    }
    if (
      typeof notification.attempts !== "number" ||
      notification.attempts < 0 ||
      notification.attempts > INQUIRY_NOTIFICATION_MAX_ATTEMPTS
    ) {
      add("error", "notification_attempts_invalid", "inquiry", inquiry._id);
    }
    if (notification.status === "terminal-failure") {
      add("error", "notification_terminal_failure", "inquiry", inquiry._id);
    } else if (
      (notification.status === "pending" || notification.status === "retry-pending") &&
      notification.nextAttemptAt &&
      notification.nextAttemptAt <= now
    ) {
      add("warning", "notification_retry_overdue", "inquiry", inquiry._id);
    } else if (
      notification.status === "sending" &&
      notification.leaseUntil &&
      notification.leaseUntil <= now
    ) {
      add("warning", "notification_lease_expired", "inquiry", inquiry._id);
    }
  }

  for (const debt of snapshot.cleanupDebt) {
    add("warning", "media_cleanup_requires_review", "media-cleanup", debt._id);
  }

  return {
    mode: "scan-only",
    generatedAt: now.toISOString(),
    counts: {
      properties: snapshot.properties.length,
      inquiries: snapshot.inquiries.length,
      cleanupDebt: snapshot.cleanupDebt.length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      errors: findings.filter((finding) => finding.severity === "error").length,
    },
    findings,
  };
}

export async function loadIntegritySnapshot(): Promise<IntegritySnapshot> {
  const [properties, inquiries, cleanupDebt] = await Promise.all([
    PropertyModel.find({})
      .select("propertyId slug purpose publicationStatus coverMedia gallery")
      .lean<IntegrityPropertyRecord[]>(),
    InquiryModel.find({})
      .select(
        "+notification propertyId inquiryType status statusHistory viewingRequest",
      )
      .lean<IntegrityInquiryRecord[]>(),
    PropertyMediaCleanupTaskModel.find({ status: "pending-review" })
      .select("property status")
      .lean<IntegrityCleanupRecord[]>(),
  ]);
  return { properties, inquiries, cleanupDebt };
}
