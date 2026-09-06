"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminPropertyListResponse } from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import { getAdminProperties } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type ListState =
  | { kind: "loading" }
  | { kind: "ready"; response: AdminPropertyListResponse }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

export function AdminPropertyList() {
  const { expireSession } = useAdminSession();
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAdminProperties(controller.signal)
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
              : "The draft property list could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession]);

  return (
    <section className={styles.page} aria-labelledby="admin-properties-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Property administration</p>
          <h1 id="admin-properties-title">Draft properties</h1>
          <p>
            Create and edit listing content without changing publication or
            availability.
          </p>
        </div>
        <Link className={styles.primaryAction} href="/admin/properties/new">
          Create draft
        </Link>
      </div>

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
          <h2>No drafts yet</h2>
          <p>Create the first private property draft. It will not appear publicly.</p>
        </div>
      ) : null}

      {state.kind === "ready" && state.response.items.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Private draft properties available to edit
            </caption>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.response.items.map((property) => (
                <tr key={property.id}>
                  <td>
                    <strong>{property.title}</strong>
                    <span>{property.propertyId}</span>
                  </td>
                  <td>
                    {property.location.city}, {property.location.province}
                  </td>
                  <td>{property.publicationStatus}</td>
                  <td>
                    {new Intl.DateTimeFormat("en-PH", {
                      dateStyle: "medium",
                    }).format(new Date(property.updatedAt))}
                  </td>
                  <td>
                    <Link href={`/admin/properties/${property.id}/edit`}>
                      Edit <span className={styles.srOnly}>{property.title}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
