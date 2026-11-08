export const LEGACY_PROPERTY_IDS = [
  "PREMIER_PROPERTY_21",
  "PREMIER_PROPERTY_60",
] as const;

export const REPLACEMENT_PROPERTY_IDS = [
  "PREMIER_PROPERTY_3",
  "PREMIER_PROPERTY_7",
  "PREMIER_PROPERTY_8",
  "PREMIER_PROPERTY_9",
  "PREMIER_PROPERTY_10",
  "PREMIER_PROPERTY_11",
] as const;

export interface RetirementGateInput {
  targetStatuses: Map<string, string | undefined>;
  publishedReplacementIds: readonly string[];
  linkedInquiryCount: number;
  backupTargetsMatch: boolean;
  backupInquiriesMatch: boolean;
}

/** The safety conditions that must all hold immediately before the archive writes. */
export function retirementBlocker(input: RetirementGateInput): string | undefined {
  if (
    LEGACY_PROPERTY_IDS.some(
      (propertyId) => input.targetStatuses.get(propertyId) !== "published",
    )
  ) {
    return "Both named legacy records must still exist and be published.";
  }
  const publishedIds = new Set(input.publishedReplacementIds);
  if (
    publishedIds.size !== REPLACEMENT_PROPERTY_IDS.length ||
    REPLACEMENT_PROPERTY_IDS.some((propertyId) => !publishedIds.has(propertyId))
  ) {
    return "Refusing retirement: all six replacement records must be published first.";
  }
  if (input.linkedInquiryCount < 1) {
    return `Refusing retirement: expected the preserved inquiry for ${LEGACY_PROPERTY_IDS[0]}.`;
  }
  if (!input.backupTargetsMatch) {
    return "Legacy records have changed since the backup; export and verify a new backup first.";
  }
  if (!input.backupInquiriesMatch) {
    return "The linked inquiry has changed since the backup; export and verify a new backup first.";
  }
  return undefined;
}
