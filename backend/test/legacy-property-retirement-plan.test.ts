import { describe, expect, it } from "vitest";
import {
  LEGACY_PROPERTY_IDS,
  REPLACEMENT_PROPERTY_IDS,
  retirementBlocker,
} from "../src/scripts/legacy-property-retirement-plan.js";

function readyInput() {
  return {
    targetStatuses: new Map(
      LEGACY_PROPERTY_IDS.map((propertyId) => [propertyId, "published"]),
    ),
    publishedReplacementIds: [...REPLACEMENT_PROPERTY_IDS],
    linkedInquiryCount: 1,
    backupTargetsMatch: true,
    backupInquiriesMatch: true,
  };
}

describe("legacy listing retirement gates", () => {
  it("allows only the exact two published legacy records after all replacements are live", () => {
    expect(retirementBlocker(readyInput())).toBeUndefined();
  });

  it("blocks the operation before any legacy record can be archived when a replacement is not published", () => {
    const input = readyInput();
    input.publishedReplacementIds = input.publishedReplacementIds.slice(0, -1);
    expect(retirementBlocker(input)).toContain("all six replacement");
  });

  it("requires the six nominated replacement IDs rather than any six published records", () => {
    const input = readyInput();
    input.publishedReplacementIds = [
      ...input.publishedReplacementIds.slice(0, -1),
      "PREMIER_PROPERTY_UNRELATED",
    ];
    expect(retirementBlocker(input)).toContain("all six replacement");
  });

  it("blocks stale backups and a missing linked inquiry", () => {
    const input = readyInput();
    input.backupTargetsMatch = false;
    expect(retirementBlocker(input)).toContain("changed since the backup");
    input.backupTargetsMatch = true;
    input.linkedInquiryCount = 0;
    expect(retirementBlocker(input)).toContain("preserved inquiry");
  });
});
