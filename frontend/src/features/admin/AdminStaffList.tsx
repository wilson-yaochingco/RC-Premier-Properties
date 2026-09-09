"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  STAFF_STATUSES,
  type AdminStaffListRequest,
  type AdminStaffListResponse,
} from "@rc/shared";
import { formatBusinessDateTime } from "@/lib/date-time";
import { ApiClientError } from "@/services/api-client";
import { getAdminStaff } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type StaffState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminStaffListResponse }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };
const label = (value: string) => value.replace(/^./, (first) => first.toUpperCase());

export function AdminStaffList() {
  const { expireSession } = useAdminSession();
  const [request, setRequest] = useState<AdminStaffListRequest>({ page: 1, limit: 25 });
  const [state, setState] = useState<StaffState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getAdminStaff(request, controller.signal)
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
              : "Staff identities could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, request]);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("query") ?? "").trim();
    const status = String(data.get("status") ?? "");
    setState({ kind: "loading" });
    setRequest({
      ...(query ? { query } : {}),
      ...(status ? { status: status as AdminStaffListRequest["status"] } : {}),
      page: 1,
      limit: 25,
    });
  }
  return (
    <section className={styles.page} aria-labelledby="staff-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Existing StaffIdentity architecture</p>
          <h1 id="staff-title">Staff identities</h1>
          <p>
            Read-only visibility into locally authorized Auth0 identities. Provisioning
            and deactivation remain deliberate CLI operations that revoke sessions and
            write audit events.
          </p>
        </div>
      </div>
      <form className={styles.filters} onSubmit={apply}>
        <label>
          Search
          <input
            name="query"
            defaultValue={request.query}
            maxLength={100}
            placeholder="Name or email"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={request.status ?? ""}>
            <option value="">All statuses</option>
            {STAFF_STATUSES.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>
      {state.kind === "loading" ? (
        <div className={styles.panel} aria-busy="true">
          Loading staff identities…
        </div>
      ) : null}
      {state.kind === "forbidden" ? (
        <div className={styles.panel} role="alert">
          Staff management permission is required.
        </div>
      ) : null}
      {state.kind === "error" ? (
        <div className={styles.panel} role="alert">
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
      {state.kind === "ready" && state.response.items.length === 0 ? (
        <div className={styles.panel}>No matching staff identities.</div>
      ) : null}
      {state.kind === "ready" && state.response.items.length > 0 ? (
        <>
          <p className={styles.resultCount}>
            {state.response.pagination.total.toLocaleString("en-PH")} staff identities
          </p>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Staff identities table"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Authorization version</th>
                </tr>
              </thead>
              <tbody>
                {state.response.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.displayName}</strong>
                      <span>{item.id}</span>
                    </td>
                    <td>{item.email}</td>
                    <td>{item.role ? label(item.role) : "Unassigned"}</td>
                    <td>{label(item.status)}</td>
                    <td>
                      {item.lastLoginAt ? (
                        <time dateTime={item.lastLoginAt}>
                          {formatBusinessDateTime(item.lastLoginAt)}
                        </time>
                      ) : (
                        "Never"
                      )}
                    </td>
                    <td>{item.authorizationVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="Staff pages">
            <button
              type="button"
              disabled={request.page <= 1}
              onClick={() => {
                setState({ kind: "loading" });
                setRequest((value) => ({ ...value, page: value.page - 1 }));
              }}
            >
              Previous
            </button>
            <span>
              Page {state.response.pagination.page} of{" "}
              {Math.max(1, state.response.pagination.totalPages)}
            </span>
            <button
              type="button"
              disabled={request.page >= state.response.pagination.totalPages}
              onClick={() => {
                setState({ kind: "loading" });
                setRequest((value) => ({ ...value, page: value.page + 1 }));
              }}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
