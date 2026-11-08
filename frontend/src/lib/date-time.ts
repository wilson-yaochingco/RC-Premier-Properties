import { BUSINESS_TIME_ZONE } from "@rc/shared";

export function formatBusinessDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

export function formatBusinessDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

/** Return the calendar date currently in use by the Philippine business workflow. */
export function businessDateInputValue(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Add whole calendar days without allowing the browser timezone to shift the date. */
export function addInputCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Move a `YYYY-MM` month by whole months using UTC calendar arithmetic. */
export function shiftInputMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

/**
 * The dates of one `YYYY-MM` month for a Sunday-first calendar grid. `leading` is the
 * number of empty cells before the 1st. Weekdays come from the date itself (UTC), so the
 * grid never depends on the visitor's browser timezone.
 */
export function inputMonthDays(month: string): { leading: number; days: string[] } {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1));
  const length = new Date(Date.UTC(year ?? 0, monthNumber ?? 1, 0)).getUTCDate();
  return {
    leading: first.getUTCDay(),
    days: Array.from({ length }, (_, index) =>
      addInputCalendarDays(`${month}-01`, index),
    ),
  };
}
