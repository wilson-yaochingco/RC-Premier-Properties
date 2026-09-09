"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AdminViewingCalendarResponse } from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import { getAdminViewingCalendar } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import {
  calendarWindow,
  currentBusinessMonth,
  monthLabel,
  shiftMonth,
} from "./viewing-calendar";
import styles from "./admin.module.css";

type CalendarState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminViewingCalendarResponse }
  | { kind: "error"; message: string };

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function label(value: string): string {
  return value.replaceAll("-", " ").replace(/^./, (first) => first.toUpperCase());
}

export function AdminViewingCalendar() {
  const { expireSession } = useAdminSession();
  const [month, setMonth] = useState(() => currentBusinessMonth());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CalendarState>({ kind: "loading" });
  const window = useMemo(() => calendarWindow(month), [month]);

  useEffect(() => {
    const controller = new AbortController();
    getAdminViewingCalendar(window.start, window.end, controller.signal)
      .then((response) => setState({ kind: "ready", response }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiClientError && error.statusCode === 401) {
          expireSession();
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "The viewing calendar could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, window.end, window.start]);

  const items = state.kind === "ready" ? state.response.items : [];
  const byDate = new Map<string, typeof items>();
  for (const item of items) {
    const dateItems = byDate.get(item.requestedDate) ?? [];
    dateItems.push(item);
    byDate.set(item.requestedDate, dateItems);
  }

  function move(offset: number) {
    setState({ kind: "loading" });
    setMonth((value) => shiftMonth(value, offset));
  }

  return (
    <section className={styles.calendarPanel} aria-labelledby="viewing-calendar-title">
      <div className={styles.calendarHeader}>
        <div>
          <p className={styles.eyebrow}>Real scheduled requests · Philippine time</p>
          <h2 id="viewing-calendar-title">{monthLabel(month)}</h2>
        </div>
        <div className={styles.calendarControls}>
          <button type="button" onClick={() => move(-1)} aria-label="Previous month">
            Previous
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Next month">
            Next
          </button>
        </div>
      </div>

      {state.kind === "loading" ? <p role="status">Loading calendar…</p> : null}
      {state.kind === "error" ? (
        <div role="alert">
          <p>{state.message}</p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
      {state.kind === "ready" ? (
        <>
          {state.response.truncated ? (
            <p role="alert">
              This month exceeds the 200-request calendar limit. Use the filtered list
              below for complete review.
            </p>
          ) : null}
          <div
            className={styles.calendarWrap}
            role="region"
            aria-label={`${monthLabel(month)} viewing calendar`}
            tabIndex={0}
          >
            <table className={styles.calendarTable}>
              <thead>
                <tr>
                  {WEEKDAYS.map((day) => (
                    <th key={day} scope="col">
                      <span aria-hidden="true">{day.slice(0, 3)}</span>
                      <span className={styles.srOnly}>{day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, week) => (
                  <tr key={week}>
                    {window.days.slice(week * 7, week * 7 + 7).map((date) => (
                      <td
                        key={date}
                        className={
                          date.startsWith(month) ? undefined : styles.outsideMonth
                        }
                      >
                        <time dateTime={date}>{Number(date.slice(-2))}</time>
                        {(byDate.get(date) ?? []).map((item) => (
                          <Link
                            key={item.inquiryId}
                            href={`/admin/inquiries/${item.inquiryId}`}
                          >
                            {item.requestedTime} ·{" "}
                            {item.propertyId ? `#${item.propertyId}` : "Viewing"}
                          </Link>
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.calendarList}>
            <h3>Schedule list</h3>
            {items.length === 0 ? (
              <p>No active viewing requests in this calendar range.</p>
            ) : (
              <ol>
                {items.map((item) => (
                  <li key={item.inquiryId}>
                    <Link href={`/admin/inquiries/${item.inquiryId}`}>
                      {item.requestedDate} at {item.requestedTime}
                    </Link>
                    <span>
                      {item.propertyId
                        ? `Premier Property #${item.propertyId}`
                        : "General viewing"}{" "}
                      · {label(item.status)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
