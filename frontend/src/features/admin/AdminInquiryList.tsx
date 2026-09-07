"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ADMIN_INQUIRY_QUEUES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  type AdminInquiryListRequest,
  type AdminInquiryListResponse,
} from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import { getAdminInquiries } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

const PAGE_SIZE = 20;

type ListState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminInquiryListResponse }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

function label(value: string): string {
  return value.replaceAll("-", " ").replace(/^./, (first) => first.toUpperCase());
}

export function AdminInquiryList() {
  const { expireSession } = useAdminSession();
  const [request, setRequest] = useState<AdminInquiryListRequest>({
    queue: "active",
    page: 1,
    limit: PAGE_SIZE,
  });
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAdminInquiries(request, controller.signal)
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
              : "The inquiry queue could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, request]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("query") ?? "").trim();
    const propertyId = String(data.get("propertyId") ?? "").trim();
    const queue = String(data.get("queue") ?? "active");
    const status = String(data.get("status") ?? "");
    const inquiryType = String(data.get("inquiryType") ?? "");
    const source = String(data.get("source") ?? "");
    setState({ kind: "loading" });
    setRequest({
      ...(query ? { query } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(status ? { status: status as AdminInquiryListRequest["status"] } : {}),
      ...(inquiryType
        ? { inquiryType: inquiryType as AdminInquiryListRequest["inquiryType"] }
        : {}),
      ...(source ? { source: source as AdminInquiryListRequest["source"] } : {}),
      queue: queue as AdminInquiryListRequest["queue"],
      page: 1,
      limit: PAGE_SIZE,
    });
  }

  function changePage(page: number) {
    setState({ kind: "loading" });
    setRequest((value) => ({ ...value, page }));
  }

  return (
    <section className={styles.page} aria-labelledby="admin-inquiries-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Staff inquiry management</p>
          <h1 id="admin-inquiries-title">Inquiries</h1>
          <p>Review leads, track follow-up, and keep spam outside the active queue.</p>
        </div>
      </div>

      <form
        className={`${styles.filters} ${styles.inquiryFilters}`}
        onSubmit={applyFilters}
      >
        <label>
          Search
          <input
            name="query"
            defaultValue={request.query}
            placeholder="Name, email, phone, property, or subject"
            maxLength={100}
          />
        </label>
        <label>
          Property ID
          <input
            name="propertyId"
            defaultValue={request.propertyId}
            placeholder="Premier Property number"
            maxLength={40}
          />
        </label>
        <label>
          Queue
          <select name="queue" defaultValue={request.queue}>
            {ADMIN_INQUIRY_QUEUES.map((queue) => (
              <option key={queue} value={queue}>
                {label(queue)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={request.status ?? ""}>
            <option value="">All statuses</option>
            {INQUIRY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select name="inquiryType" defaultValue={request.inquiryType ?? ""}>
            <option value="">All inquiry types</option>
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {label(type)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select name="source" defaultValue={request.source ?? ""}>
            <option value="">All sources</option>
            {INQUIRY_SOURCES.map((source) => (
              <option key={source} value={source}>
                {label(source)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>

      {state.kind === "loading" ? (
        <div className={styles.panel} aria-busy="true">
          <p>Loading private inquiries…</p>
        </div>
      ) : null}

      {state.kind === "forbidden" ? (
        <div className={styles.panel} role="alert">
          <h2>Permission required</h2>
          <p>Your staff session cannot read inquiries.</p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className={styles.panel} role="alert">
          <h2>Inquiries unavailable</h2>
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
          <h2>No matching inquiries</h2>
          <p>Adjust the filters or choose another queue.</p>
        </div>
      ) : null}

      {state.kind === "ready" && state.response.items.length > 0 ? (
        <>
          <p className={styles.resultCount} role="status">
            {state.response.pagination.total.toLocaleString("en-PH")} inquiries found
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Private staff inquiry queue</caption>
              <thead>
                <tr>
                  <th scope="col">Contact</th>
                  <th scope="col">Type</th>
                  <th scope="col">Property</th>
                  <th scope="col">Status</th>
                  <th scope="col">Received</th>
                  <th scope="col">
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.response.items.map((inquiry) => (
                  <tr key={inquiry.id}>
                    <td>
                      <strong>{inquiry.name}</strong>
                      <span>{inquiry.email}</span>
                    </td>
                    <td>{label(inquiry.inquiryType)}</td>
                    <td>
                      {inquiry.propertyId
                        ? `Premier Property #${inquiry.propertyId}`
                        : "Not property-specific"}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          inquiry.status === "spam"
                            ? styles.status_spam
                            : inquiry.status === "closed" || inquiry.status === "lost"
                              ? styles.status_closed
                              : ""
                        }`}
                      >
                        {label(inquiry.status)}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(inquiry.createdAt))}
                    </td>
                    <td>
                      <Link href={`/admin/inquiries/${inquiry.id}`}>View details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="Inquiry pages">
            <button
              type="button"
              disabled={request.page <= 1}
              onClick={() => changePage(request.page - 1)}
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
              onClick={() => changePage(request.page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
