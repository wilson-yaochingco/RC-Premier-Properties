import type { AdminInquirySummary, AdminPropertySummary } from "@rc/shared";

function cell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  const neutralized = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

function rows(values: Array<Array<string | number | undefined>>): string {
  return `\uFEFF${values.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function propertyPageCsv(items: AdminPropertySummary[]): string {
  return rows([
    [
      "Property ID",
      "Title",
      "City",
      "Province",
      "Publication",
      "Availability",
      "Featured",
      "Featured priority",
      "Price PHP",
      "Updated",
    ],
    ...items.map((item) => [
      item.propertyId,
      item.title,
      item.location.city,
      item.location.province,
      item.publicationStatus,
      item.availability,
      item.featured ? "Yes" : "No",
      item.featuredOrder,
      item.price.amount,
      item.updatedAt,
    ]),
  ]);
}

export function inquiryPageCsv(items: AdminInquirySummary[]): string {
  return rows([
    [
      "Inquiry ID",
      "Name",
      "Email",
      "Type",
      "Status",
      "Property ID",
      "Viewing status",
      "Requested date",
      "Requested time",
      "Received",
    ],
    ...items.map((item) => [
      item.id,
      item.name,
      item.email,
      item.inquiryType,
      item.status,
      item.propertyId,
      item.viewingRequest?.status,
      item.viewingRequest?.requestedDate,
      item.viewingRequest?.requestedTime,
      item.createdAt,
    ]),
  ]);
}

export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
