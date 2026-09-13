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
  omittedFindings?: number;
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
  maxFindings = 500,
): IntegrityReport {
  const findings: IntegrityFinding[] = [];
  let warnings = 0;
  let errors = 0;
  let omittedFindings = 0;
  const add = (
    severity: IntegritySeverity,
    code: string,
    type: IntegrityFinding["entityType"],
    id: unknown,
  ) => {
    if (severity === "warning") warnings += 1;
    else errors += 1;
    if (findings.length < maxFindings) {
      findings.push({ severity, code, entityType: type, entityId: entityId(id) });
    } else {
      omittedFindings += 1;
    }
  };

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
    if (!inquiry.statusHistory?.length) {
      add("warning", "inquiry_history_missing", "inquiry", inquiry._id);
    } else if (latestInquiryStatus !== inquiry.status) {
      add("error", "inquiry_history_inconsistent", "inquiry", inquiry._id);
    }
    const latestViewingStatus = inquiry.viewingRequest?.statusHistory?.at(-1)?.toStatus;
    if (inquiry.viewingRequest && !inquiry.viewingRequest.statusHistory?.length) {
      add("warning", "viewing_history_missing", "inquiry", inquiry._id);
    } else if (
      inquiry.viewingRequest &&
      latestViewingStatus !== inquiry.viewingRequest.status
    ) {
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
      warnings,
      errors,
    },
    findings,
    ...(omittedFindings > 0 ? { omittedFindings } : {}),
  };
}

const INTEGRITY_MAX_FINDINGS = 500;
const INTEGRITY_QUERY_TIMEOUT_MS = 30_000;

interface IdOnly {
  _id: unknown;
}

/**
 * Return one row per duplicate record without collecting every same-key ID into one
 * MongoDB document. A corrupt group can therefore be arbitrarily large without a
 * `$push` array exceeding the document-size limit.
 */
export function duplicateRecordPipeline(
  field: "propertyId" | "slug" | "notification.notificationId",
  caseInsensitive = false,
) {
  const reference = `$${field}`;
  return [
    { $match: { [field]: { $type: "string" } } },
    {
      $setWindowFields: {
        partitionBy: caseInsensitive ? { $toUpper: reference } : reference,
        output: { duplicateCount: { $count: {} } },
      },
    },
    { $match: { duplicateCount: { $gt: 1 } } },
    { $project: { _id: 1 } },
  ];
}

/**
 * Scan every record without retaining growing collections together in memory.
 * `batchSize` controls database cursor batches, never the number of records checked.
 */
export async function scanDataIntegrity(
  batchSize: number,
  now: Date = new Date(),
): Promise<IntegrityReport> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("Integrity scan batch size must be an integer from 1 to 500.");
  }

  const findings: IntegrityFinding[] = [];
  let warnings = 0;
  let errors = 0;
  let omittedFindings = 0;
  const add = (finding: IntegrityFinding) => {
    if (finding.severity === "warning") warnings += 1;
    else errors += 1;
    if (findings.length < INTEGRITY_MAX_FINDINGS) findings.push(finding);
    else omittedFindings += 1;
  };
  const addFrom = (
    report: IntegrityReport,
    entityType: IntegrityFinding["entityType"],
  ) =>
    report.findings.filter((finding) => finding.entityType === entityType).forEach(add);

  const [propertyCount, inquiryCount, cleanupDebtCount] = await Promise.all([
    PropertyModel.countDocuments({}).maxTimeMS(INTEGRITY_QUERY_TIMEOUT_MS),
    InquiryModel.countDocuments({}).maxTimeMS(INTEGRITY_QUERY_TIMEOUT_MS),
    PropertyMediaCleanupTaskModel.countDocuments({
      status: "pending-review",
    }).maxTimeMS(INTEGRITY_QUERY_TIMEOUT_MS),
  ]);

  const duplicatePropertyIds = PropertyModel.aggregate<IdOnly>(
    duplicateRecordPipeline("propertyId", true),
  )
    .option({ maxTimeMS: INTEGRITY_QUERY_TIMEOUT_MS })
    .cursor({ batchSize });
  for await (const record of duplicatePropertyIds) {
    add({
      severity: "error",
      code: "property_id_duplicate",
      entityType: "property",
      entityId: entityId(record._id),
    });
  }

  const duplicateSlugs = PropertyModel.aggregate<IdOnly>(
    duplicateRecordPipeline("slug"),
  )
    .option({ maxTimeMS: INTEGRITY_QUERY_TIMEOUT_MS })
    .cursor({ batchSize });
  for await (const record of duplicateSlugs) {
    add({
      severity: "error",
      code: "property_slug_duplicate",
      entityType: "property",
      entityId: entityId(record._id),
    });
  }

  const duplicateNotifications = InquiryModel.aggregate<IdOnly>(
    duplicateRecordPipeline("notification.notificationId"),
  )
    .option({ maxTimeMS: INTEGRITY_QUERY_TIMEOUT_MS })
    .cursor({ batchSize });
  for await (const record of duplicateNotifications) {
    add({
      severity: "error",
      code: "notification_identity_duplicate",
      entityType: "inquiry",
      entityId: entityId(record._id),
    });
  }

  const missingPropertyReferences = InquiryModel.aggregate<IdOnly>([
    { $match: { propertyId: { $type: "string" } } },
    {
      $lookup: {
        from: PropertyModel.collection.name,
        localField: "propertyId",
        foreignField: "propertyId",
        as: "referencedProperty",
      },
    },
    { $match: { "referencedProperty.0": { $exists: false } } },
    { $project: { _id: 1 } },
  ])
    .option({ maxTimeMS: INTEGRITY_QUERY_TIMEOUT_MS })
    .cursor({ batchSize });
  for await (const record of missingPropertyReferences) {
    add({
      severity: "error",
      code: "inquiry_property_missing",
      entityType: "inquiry",
      entityId: entityId(record._id),
    });
  }

  const propertyCursor = PropertyModel.find({})
    .select("propertyId slug purpose publicationStatus coverMedia gallery")
    .maxTimeMS(INTEGRITY_QUERY_TIMEOUT_MS)
    .lean<IntegrityPropertyRecord>()
    .cursor({ batchSize });
  for await (const property of propertyCursor) {
    addFrom(
      inspectDataIntegrity(
        { properties: [property], inquiries: [], cleanupDebt: [] },
        now,
      ),
      "property",
    );
  }

  const inquiryCursor = InquiryModel.find({})
    .select("+notification propertyId inquiryType status statusHistory viewingRequest")
    .maxTimeMS(INTEGRITY_QUERY_TIMEOUT_MS)
    .lean<IntegrityInquiryRecord>()
    .cursor({ batchSize });
  for await (const inquiry of inquiryCursor) {
    addFrom(
      inspectDataIntegrity(
        {
          properties: inquiry.propertyId
            ? [{ _id: "synthetic-reference", propertyId: inquiry.propertyId }]
            : [],
          inquiries: [inquiry],
          cleanupDebt: [],
        },
        now,
      ),
      "inquiry",
    );
  }

  const cleanupCursor = PropertyMediaCleanupTaskModel.find({
    status: "pending-review",
  })
    .select("property status")
    .maxTimeMS(INTEGRITY_QUERY_TIMEOUT_MS)
    .lean<IntegrityCleanupRecord>()
    .cursor({ batchSize });
  for await (const debt of cleanupCursor) {
    addFrom(
      inspectDataIntegrity({ properties: [], inquiries: [], cleanupDebt: [debt] }, now),
      "media-cleanup",
    );
  }

  return {
    mode: "scan-only",
    generatedAt: now.toISOString(),
    counts: {
      properties: propertyCount,
      inquiries: inquiryCount,
      cleanupDebt: cleanupDebtCount,
      warnings,
      errors,
    },
    findings,
    ...(omittedFindings > 0 ? { omittedFindings } : {}),
  };
}
