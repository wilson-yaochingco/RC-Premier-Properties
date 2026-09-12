"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  FEATURED_PROPERTY_ORDER_MAX,
  FEATURED_PROPERTY_ORDER_MIN,
  PROPERTY_AVAILABILITY,
  PROPERTY_PUBLICATION_STATUSES,
  type AdminPropertyListRequest,
  type AdminPropertyListResponse,
  type AdminPropertySummary,
  type PropertyAvailability,
} from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import {
  changeAdminPropertyAvailability,
  getAdminProperties,
  transitionAdminProperty,
  updateAdminPropertyFeatured,
} from "./admin.service";
import { useAdminSession } from "./AdminShell";
import { downloadCsv, propertyPageCsv } from "./admin-csv";
import styles from "./admin.module.css";

type ListState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminPropertyListResponse }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

const PAGE_SIZE = 20;

function label(value: string): string {
  return value.replaceAll("-", " ").replace(/^./, (first) => first.toUpperCase());
}

export function AdminPropertyList() {
  const { session, expireSession } = useAdminSession();
  const [request, setRequest] = useState<AdminPropertyListRequest>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pendingId, setPendingId] = useState<string>();
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string }>();

  useEffect(() => {
    const controller = new AbortController();
    getAdminProperties(request, controller.signal)
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
              : "The private property list could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, request]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });
    const data = new FormData(event.currentTarget);
    const query = String(data.get("query") ?? "").trim();
    const publicationStatus = String(data.get("publicationStatus") ?? "");
    const availability = String(data.get("availability") ?? "");
    const featured = String(data.get("featured") ?? "");
    setRequest({
      ...(query ? { query } : {}),
      ...(publicationStatus
        ? {
            publicationStatus:
              publicationStatus as AdminPropertyListRequest["publicationStatus"],
          }
        : {}),
      ...(availability ? { availability: availability as PropertyAvailability } : {}),
      ...(featured ? { featured: featured === "true" } : {}),
      page: 1,
      limit: PAGE_SIZE,
    });
  }

  async function mutateFeatured(
    property: AdminPropertySummary,
    featured: boolean,
    featuredOrder?: number | null,
  ) {
    setPendingId(property.id);
    setNotice(undefined);
    try {
      await updateAdminPropertyFeatured(
        property.id,
        {
          expectedVersion: property.version,
          featured,
          ...(featuredOrder !== undefined ? { featuredOrder } : {}),
        },
        session.csrfToken,
      );
      setNotice({
        kind: "success",
        text: featured
          ? `Premier Property #${property.propertyId} is now Featured.`
          : `Premier Property #${property.propertyId} was removed from Featured Properties.`,
      });
      setState({ kind: "loading" });
      setAttempt((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        expireSession();
        return;
      }
      setNotice({
        kind: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "Featured Property settings could not be updated.",
      });
    } finally {
      setPendingId(undefined);
    }
  }

  async function mutate(
    property: AdminPropertySummary,
    action: "publish" | "unpublish" | "archive" | "restore" | PropertyAvailability,
  ) {
    const destructive =
      action === "archive" || action === "unpublish" || action === "sold";
    if (
      destructive &&
      !window.confirm(
        action === "archive"
          ? `Archive Premier Property #${property.propertyId}? It will be removed from public results and retained for audit history.`
          : action === "unpublish"
            ? `Unpublish Premier Property #${property.propertyId}? It will be removed from public search and detail pages.`
            : `Mark Premier Property #${property.propertyId} as sold? Sold is a terminal availability state.`,
      )
    ) {
      return;
    }

    setPendingId(property.id);
    setNotice(undefined);
    try {
      if (["available", "reserved", "sold"].includes(action)) {
        await changeAdminPropertyAvailability(
          property.id,
          {
            expectedVersion: property.version,
            availability: action as PropertyAvailability,
          },
          session.csrfToken,
        );
      } else {
        await transitionAdminProperty(
          property.id,
          action as "publish" | "unpublish" | "archive" | "restore",
          property.version,
          session.csrfToken,
        );
      }
      setNotice({
        kind: "success",
        text: `Premier Property #${property.propertyId} was ${
          {
            publish: "published",
            unpublish: "unpublished",
            archive: "archived",
            restore: "restored",
            reserved: "reserved",
            sold: "marked sold",
            available: "made available",
          }[action]
        }.`,
      });
      setState({ kind: "loading" });
      setAttempt((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        expireSession();
        return;
      }
      setNotice({
        kind: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "The property lifecycle could not be updated.",
      });
    } finally {
      setPendingId(undefined);
    }
  }

  const canPublish = session.permissions.includes("property:publish");
  const canChangeAvailability = session.permissions.includes(
    "property:change-availability",
  );
  const canFeature = session.permissions.includes("property:write");

  function changePage(page: number) {
    setState({ kind: "loading" });
    setRequest((value) => ({ ...value, page }));
  }

  return (
    <section className={styles.page} aria-labelledby="admin-properties-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Property administration</p>
          <h1 id="admin-properties-title">Properties</h1>
          <p>Search, preview, publish, update availability, and archive listings.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          {state.kind === "ready" && state.response.items.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  "rc-premier-properties-page.csv",
                  propertyPageCsv(state.response.items),
                )
              }
            >
              Export current page CSV
            </button>
          ) : null}
          <Link className={styles.primaryAction} href="/admin/properties/new">
            Create draft
          </Link>
        </div>
      </div>

      <form className={styles.filters} onSubmit={applyFilters}>
        <label>
          Search
          <input
            name="query"
            defaultValue={request.query}
            placeholder="Premier Property number, title, slug, or city"
            maxLength={120}
          />
        </label>
        <label>
          Publication
          <select
            name="publicationStatus"
            defaultValue={request.publicationStatus ?? ""}
          >
            <option value="">All publication states</option>
            {PROPERTY_PUBLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Availability
          <select name="availability" defaultValue={request.availability ?? ""}>
            <option value="">All availability states</option>
            {PROPERTY_AVAILABILITY.map((availability) => (
              <option key={availability} value={availability}>
                {label(availability)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Featured
          <select name="featured" defaultValue={request.featured?.toString() ?? ""}>
            <option value="">All properties</option>
            <option value="true">Featured</option>
            <option value="false">Not featured</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>

      {notice ? (
        <div
          className={
            notice.kind === "success" ? styles.successMessage : styles.errorSummary
          }
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      ) : null}

      {state.kind === "loading" ? (
        <div className={styles.panel} aria-busy="true">
          <p>Loading private properties…</p>
        </div>
      ) : null}

      {state.kind === "forbidden" ? (
        <div className={styles.panel} role="alert">
          <h2>Permission required</h2>
          <p>Your staff session cannot read private properties.</p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className={styles.panel} role="alert">
          <h2>Properties unavailable</h2>
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
          <h2>No matching properties</h2>
          <p>Adjust the filters or create a new private property draft.</p>
        </div>
      ) : null}

      {state.kind === "ready" && state.response.items.length > 0 ? (
        <>
          <p className={styles.resultCount} role="status">
            {state.response.pagination.total.toLocaleString("en-PH")} properties found
          </p>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Private properties table"
            tabIndex={0}
          >
            <table className={`${styles.table} ${styles.responsiveTable}`}>
              <caption className={styles.srOnly}>
                Private properties and lifecycle actions
              </caption>
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Location</th>
                  <th scope="col">Publication</th>
                  <th scope="col">Availability</th>
                  <th scope="col">Featured</th>
                  <th scope="col">Readiness</th>
                  <th scope="col">Updated</th>
                  <th scope="col">
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.response.items.map((property) => (
                  <tr key={property.id}>
                    <td data-label="Property">
                      <strong>{property.title}</strong>
                      <span>Premier Property #{property.propertyId}</span>
                    </td>
                    <td data-label="Location">
                      {property.location.city}, {property.location.province}
                    </td>
                    <td data-label="Publication">
                      {label(property.publicationStatus)}
                    </td>
                    <td data-label="Availability">{label(property.availability)}</td>
                    <td data-label="Featured">
                      <div className={styles.featuredCell}>
                        {property.featured ? (
                          <span className={styles.featuredBadge}>Featured</span>
                        ) : (
                          <span className={styles.mutedBadge}>Not featured</span>
                        )}
                        {canFeature &&
                        property.publicationStatus === "published" &&
                        property.availability !== "sold" ? (
                          <form
                            className={styles.featuredForm}
                            onSubmit={(event) => {
                              event.preventDefault();
                              const data = new FormData(event.currentTarget);
                              const rawOrder = String(
                                data.get("featuredOrder") ?? "",
                              ).trim();
                              void mutateFeatured(
                                property,
                                true,
                                rawOrder ? Number(rawOrder) : null,
                              );
                            }}
                          >
                            <label>
                              Priority
                              <input
                                name="featuredOrder"
                                type="number"
                                min={FEATURED_PROPERTY_ORDER_MIN}
                                max={FEATURED_PROPERTY_ORDER_MAX}
                                defaultValue={property.featuredOrder}
                                aria-label={`Featured priority for Premier Property #${property.propertyId}`}
                              />
                            </label>
                            <button type="submit" disabled={pendingId === property.id}>
                              {property.featured ? "Save priority" : "Feature"}
                            </button>
                            {property.featured ? (
                              <button
                                type="button"
                                disabled={pendingId === property.id}
                                onClick={() =>
                                  void mutateFeatured(property, false, null)
                                }
                              >
                                Remove Featured
                              </button>
                            ) : null}
                          </form>
                        ) : null}
                        {canFeature &&
                        property.featured &&
                        (property.publicationStatus !== "published" ||
                          property.availability === "sold") ? (
                          <button
                            type="button"
                            className={styles.featuredRemoveButton}
                            disabled={pendingId === property.id}
                            onClick={() => void mutateFeatured(property, false, null)}
                          >
                            Remove Featured
                          </button>
                        ) : null}
                        <small>Higher priority appears first.</small>
                      </div>
                    </td>
                    <td data-label="Readiness">
                      {property.publicationReadiness.ready
                        ? "Complete"
                        : `Missing: ${property.publicationReadiness.missing.join(", ")}`}
                    </td>
                    <td data-label="Updated">
                      {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
                        new Date(property.updatedAt),
                      )}
                    </td>
                    <td data-label="Actions">
                      <div className={styles.rowActions}>
                        <Link href={`/admin/properties/${property.id}/preview`}>
                          Preview
                        </Link>
                        {["draft", "unpublished"].includes(
                          property.publicationStatus,
                        ) ? (
                          <Link href={`/admin/properties/${property.id}/edit`}>
                            Edit
                          </Link>
                        ) : null}
                        {canPublish &&
                        ["draft", "unpublished"].includes(
                          property.publicationStatus,
                        ) ? (
                          <button
                            disabled={
                              pendingId === property.id ||
                              !property.publicationReadiness.ready
                            }
                            title={
                              property.publicationReadiness.ready
                                ? undefined
                                : `Complete before publishing: ${property.publicationReadiness.missing.join(", ")}`
                            }
                            onClick={() => mutate(property, "publish")}
                          >
                            Publish
                          </button>
                        ) : null}
                        {canPublish && property.publicationStatus === "published" ? (
                          <button
                            disabled={pendingId === property.id}
                            onClick={() => mutate(property, "unpublish")}
                          >
                            Unpublish
                          </button>
                        ) : null}
                        {canPublish && property.publicationStatus !== "archived" ? (
                          <button
                            disabled={pendingId === property.id}
                            onClick={() => mutate(property, "archive")}
                          >
                            Archive
                          </button>
                        ) : null}
                        {canPublish && property.publicationStatus === "archived" ? (
                          <button
                            disabled={pendingId === property.id}
                            onClick={() => mutate(property, "restore")}
                          >
                            Restore
                          </button>
                        ) : null}
                        {canChangeAvailability &&
                        property.publicationStatus === "published" &&
                        property.availability === "available" ? (
                          <button
                            disabled={pendingId === property.id}
                            onClick={() => mutate(property, "reserved")}
                          >
                            Reserve
                          </button>
                        ) : null}
                        {canChangeAvailability &&
                        property.publicationStatus === "published" &&
                        property.availability === "reserved" ? (
                          <button
                            disabled={pendingId === property.id}
                            onClick={() => mutate(property, "available")}
                          >
                            Make available
                          </button>
                        ) : null}
                        {canChangeAvailability &&
                        property.publicationStatus === "published" &&
                        property.availability !== "sold" ? (
                          <button
                            disabled={pendingId === property.id}
                            onClick={() => mutate(property, "sold")}
                          >
                            Mark sold
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="Property pages">
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
