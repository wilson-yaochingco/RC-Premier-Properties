"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_OUTCOMES,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
} from "@rc/shared";
import { formatBusinessDateTime } from "@/lib/date-time";
import { ApiClientError } from "@/services/api-client";
import { getAdminAuditEvents } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type AuditState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminAuditListResponse }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

function label(value: string): string {
  return value
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .replace(/^./, (first) => first.toUpperCase());
}

export function AdminAuditViewer() {
  const { expireSession } = useAdminSession();
  const [request, setRequest] = useState<AdminAuditListRequest>({ page: 1, limit: 25 });
  const [state, setState] = useState<AuditState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAdminAuditEvents(request, controller.signal)
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
              : "Audit events could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, request]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    setState({ kind: "loading" });
    setRequest({
      ...(value("action")
        ? { action: value("action") as AdminAuditListRequest["action"] }
        : {}),
      ...(value("entityType")
        ? { entityType: value("entityType") as AdminAuditListRequest["entityType"] }
        : {}),
      ...(value("outcome")
        ? { outcome: value("outcome") as AdminAuditListRequest["outcome"] }
        : {}),
      ...(value("from") ? { from: value("from") } : {}),
      ...(value("to") ? { to: value("to") } : {}),
      page: 1,
      limit: 25,
    });
  }

  return (
    <section className={styles.page} aria-labelledby="audit-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Security and business operations</p>
          <h1 id="audit-title">Audit events</h1>
          <p>
            Value-minimized activity records. Event payloads, customer messages,
            property values, tokens, and private locations are not exposed.
          </p>
        </div>
      </div>
      <form className={`${styles.filters} ${styles.auditFilters}`} onSubmit={apply}>
        <label>
          Action
          <select name="action" defaultValue={request.action ?? ""}>
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entity
          <select name="entityType" defaultValue={request.entityType ?? ""}>
            <option value="">All entities</option>
            {AUDIT_ENTITY_TYPES.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Outcome
          <select name="outcome" defaultValue={request.outcome ?? ""}>
            <option value="">All outcomes</option>
            {AUDIT_OUTCOMES.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input name="from" type="date" defaultValue={request.from} />
        </label>
        <label>
          To
          <input name="to" type="date" defaultValue={request.to} />
        </label>
        <button type="submit">Apply filters</button>
      </form>
      {state.kind === "loading" ? (
        <div className={styles.panel} aria-busy="true">
          Loading audit events…
        </div>
      ) : null}
      {state.kind === "forbidden" ? (
        <div className={styles.panel} role="alert">
          Audit read permission is required.
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
        <div className={styles.panel}>
          <h2>No matching events</h2>
          <p>Adjust the filters to review another activity window.</p>
        </div>
      ) : null}
      {state.kind === "ready" && state.response.items.length > 0 ? (
        <>
          <p className={styles.resultCount} role="status">
            {state.response.pagination.total.toLocaleString("en-PH")} events found
          </p>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Audit events table"
            tabIndex={0}
          >
            <table className={styles.table}>
              <caption className={styles.srOnly}>Value-minimized audit events</caption>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Outcome</th>
                  <th>Entity</th>
                  <th>Staff ID</th>
                  <th>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {state.response.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <time dateTime={item.occurredAt}>
                        {formatBusinessDateTime(item.occurredAt)}
                      </time>
                    </td>
                    <td>{label(item.action)}</td>
                    <td>{label(item.outcome)}</td>
                    <td>
                      {label(item.entityType)}
                      {item.entityId ? <span>{item.entityId}</span> : null}
                    </td>
                    <td>{item.actorStaffIdentityId ?? "System"}</td>
                    <td>{item.requestId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="Audit event pages">
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
