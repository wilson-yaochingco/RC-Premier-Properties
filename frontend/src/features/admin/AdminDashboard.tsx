"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminDashboardResponse } from "@rc/shared";
import { formatBusinessDateTime } from "@/lib/date-time";
import { ApiClientError } from "@/services/api-client";
import { getAdminDashboard } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type DashboardState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminDashboardResponse }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

function label(value: string): string {
  return value.replaceAll("-", " ").replace(/^./, (first) => first.toUpperCase());
}

export function AdminDashboard() {
  const { expireSession } = useAdminSession();
  const [state, setState] = useState<DashboardState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAdminDashboard(controller.signal)
      .then((response) => setState({ kind: "ready", response }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiClientError && error.statusCode === 401) {
          expireSession();
          return;
        }
        if (error instanceof ApiClientError && error.statusCode === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "The operations dashboard could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession]);

  if (state.kind === "loading") {
    return (
      <div className={styles.panel} aria-busy="true">
        Loading operations dashboard…
      </div>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <div className={styles.panel} role="alert">
        Property and inquiry read permissions are required.
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className={styles.panel} role="alert">
        <h1>Dashboard unavailable</h1>
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
    );
  }

  const data = state.response;
  const metrics = [
    ["Published properties", data.properties.published, "/admin/properties"],
    ["Draft properties", data.properties.draft, "/admin/properties"],
    ["Unpublished properties", data.properties.unpublished, "/admin/properties"],
    ["Available", data.properties.available, "/admin/properties"],
    ["Reserved", data.properties.reserved, "/admin/properties"],
    ["Sold", data.properties.sold, "/admin/properties"],
    ["Active inquiries", data.inquiries.active, "/admin/inquiries"],
    ["New inquiries", data.inquiries.new, "/admin/inquiries"],
  ] as const;

  return (
    <section className={styles.page} aria-labelledby="dashboard-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Daily operations</p>
          <h1 id="dashboard-title">Dashboard</h1>
          <p>Live operational counts from property and inquiry records.</p>
        </div>
        <p className={styles.resultCount}>
          Updated{" "}
          <time dateTime={data.generatedAt}>
            {formatBusinessDateTime(data.generatedAt)}
          </time>
        </p>
      </div>

      <div className={styles.metricGrid}>
        {metrics.map(([name, value, href]) => (
          <Link href={href} className={styles.metricCard} key={name}>
            <span>{name}</span>
            <strong>{value.toLocaleString("en-PH")}</strong>
          </Link>
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        <section
          className={styles.detailCard}
          aria-labelledby="upcoming-viewings-title"
        >
          <div className={styles.detailHeading}>
            <div>
              <p className={styles.eyebrow}>Philippine time</p>
              <h2 id="upcoming-viewings-title">Upcoming viewings</h2>
            </div>
            <Link href="/admin/viewings">Open calendar</Link>
          </div>
          {data.upcomingViewings.length === 0 ? (
            <p>No active future viewing requests.</p>
          ) : (
            <ol className={styles.operationList}>
              {data.upcomingViewings.map((viewing) => (
                <li key={viewing.inquiryId}>
                  <Link href={`/admin/inquiries/${viewing.inquiryId}`}>
                    {viewing.requestedDate} at {viewing.requestedTime}
                  </Link>
                  <span>
                    {viewing.propertyId
                      ? `Premier Property #${viewing.propertyId}`
                      : "General viewing"}{" "}
                    · {label(viewing.status)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {data.upcomingViewingCount > data.upcomingViewings.length ? (
            <p>
              {(
                data.upcomingViewingCount - data.upcomingViewings.length
              ).toLocaleString("en-PH")}{" "}
              more upcoming requests are available in the viewing calendar.
            </p>
          ) : null}
        </section>

        <aside
          className={styles.detailCard}
          aria-labelledby="operations-attention-title"
        >
          <h2 id="operations-attention-title">Needs attention</h2>
          <dl className={styles.operationCounts}>
            <div>
              <dt>Notification retries pending</dt>
              <dd>{data.notifications.retryPending}</dd>
            </div>
            <div>
              <dt>Terminal notification failures</dt>
              <dd>{data.notifications.terminalFailure}</dd>
            </div>
            <div>
              <dt>Media cleanup records</dt>
              <dd>{data.mediaCleanupDebtCount}</dd>
            </div>
          </dl>
          <p>
            Notification retries and media cleanup remain provider-neutral operator
            workflows. No destructive cleanup runs from this dashboard.
          </p>
        </aside>
      </div>
    </section>
  );
}
