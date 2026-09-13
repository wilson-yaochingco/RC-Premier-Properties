"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { AdminInquirySearchItem, AdminPropertySummary } from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import { getAdminProperties, searchAdminInquiries } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ready";
      properties: AdminPropertySummary[];
      inquiries: AdminInquirySearchItem[];
    }
  | { kind: "error"; message: string };

function label(value: string): string {
  return value.replaceAll("-", " ").replace(/^./, (first) => first.toUpperCase());
}

export function AdminSearch() {
  const { session, expireSession } = useAdminSession();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const canReadProperties = session.permissions.includes("property:read-private");
  const canReadInquiries = session.permissions.includes("inquiry:read");

  useEffect(() => {
    if (!submitted) return;
    const controller = new AbortController();
    const properties = canReadProperties
      ? getAdminProperties({ query: submitted, page: 1, limit: 5 }, controller.signal)
      : Promise.resolve({
          items: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        });
    const inquiries = canReadInquiries
      ? searchAdminInquiries(submitted, controller.signal)
      : Promise.resolve({
          items: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        });
    Promise.all([properties, inquiries])
      .then(([propertyResponse, inquiryResponse]) =>
        setState({
          kind: "ready",
          properties: propertyResponse.items,
          inquiries: inquiryResponse.items,
        }),
      )
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
              : "Staff search could not be completed.",
        });
      });
    return () => controller.abort();
  }, [canReadInquiries, canReadProperties, expireSession, submitted]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    setState({ kind: "loading" });
    setSubmitted(normalized);
  }

  return (
    <section className={styles.page} aria-labelledby="admin-search-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Protected records</p>
          <h1 id="admin-search-title">Search administration</h1>
          <p>
            Find property records and inquiry identifiers without searching customer
            message bodies.
          </p>
        </div>
      </div>
      <form className={styles.searchPanel} onSubmit={search} role="search">
        <label htmlFor="admin-search">
          Premier Property number, title, inquiry ID, or safe lead identifier
        </label>
        <div>
          <input
            id="admin-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
          <button type="submit">Search</button>
        </div>
      </form>
      {state.kind === "loading" ? (
        <div className={styles.panel} aria-busy="true">
          Searching protected records…
        </div>
      ) : null}
      {state.kind === "error" ? (
        <div className={styles.panel} role="alert">
          {state.message}
        </div>
      ) : null}
      {state.kind === "ready" ? (
        <div className={styles.dashboardGrid}>
          <section
            className={styles.detailCard}
            aria-labelledby="search-properties-title"
          >
            <h2 id="search-properties-title">Properties</h2>
            {!canReadProperties ? (
              <p>Property read permission is unavailable.</p>
            ) : state.properties.length === 0 ? (
              <p>No matching properties.</p>
            ) : (
              <ul className={styles.searchResults}>
                {state.properties.map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/properties/${item.id}/preview`}>
                      {item.title}
                    </Link>
                    <span>
                      Premier Property #{item.propertyId} ·{" "}
                      {label(item.publicationStatus)} · {item.location.city}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section
            className={styles.detailCard}
            aria-labelledby="search-inquiries-title"
          >
            <h2 id="search-inquiries-title">Inquiries</h2>
            {!canReadInquiries ? (
              <p>Inquiry read permission is unavailable.</p>
            ) : state.inquiries.length === 0 ? (
              <p>No matching inquiries.</p>
            ) : (
              <ul className={styles.searchResults}>
                {state.inquiries.map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/inquiries/${item.id}`}>Inquiry {item.id}</Link>
                    <span>
                      {label(item.inquiryType)} · {label(item.status)}
                      {item.propertyId ? ` · Premier Property #${item.propertyId}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
