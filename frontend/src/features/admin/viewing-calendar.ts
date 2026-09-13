import { BUSINESS_TIME_ZONE } from "@rc/shared";

export interface CalendarWindow {
  month: string;
  start: string;
  end: string;
  days: string[];
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function currentBusinessMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const value = (type: "year" | "month") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}`;
}

export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function calendarWindow(month: string): CalendarWindow {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid calendar month.");
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  if (first.toISOString().slice(0, 7) !== month)
    throw new Error("Invalid calendar month.");
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return isoDate(date);
  });
  return { month, start: days[0]!, end: days[41]!, days };
}

export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}
